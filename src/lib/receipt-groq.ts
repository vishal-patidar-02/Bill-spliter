import { ReceiptDraft, ReceiptLineItem } from './types';
import { parseMoney, roundMoney } from './utils';

interface GroqLineItem {
  name?: string;
  qty?: number;
  unitPrice?: number;
  totalPrice?: number;
  confidence?: number;
}

interface GroqReceiptResponse {
  merchant?: string;
  receiptDate?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  lineItems?: GroqLineItem[];
  warnings?: string[];
}

function buildLineItem(item: GroqLineItem): ReceiptLineItem | null {
  const name = (item.name || '').trim();
  if (!name) return null;

  const totalPrice = parseMoney(item.totalPrice ?? 0);
  const qty = Number.isFinite(item.qty) && (item.qty as number) > 0 ? Number(item.qty) : 1;
  const unitPrice = parseMoney(item.unitPrice ?? (qty > 0 ? totalPrice / qty : totalPrice));
  const confidence = Number.isFinite(item.confidence) ? Number(item.confidence) : 0.8;

  if (totalPrice <= 0) return null;

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `line-${Math.random().toString(36).slice(2, 10)}`,
    name,
    qty,
    unitPrice,
    totalPrice,
    confidence: Math.max(0, Math.min(1, confidence)),
    include: true,
  };
}

function sanitizeDraft(input: GroqReceiptResponse): ReceiptDraft {
  const merchant = (input.merchant || 'Receipt').trim() || 'Receipt';
  const receiptDate = (input.receiptDate || new Date().toISOString().slice(0, 10)).trim();
  const currency = (input.currency || 'INR').trim() || 'INR';

  const lineItems = (input.lineItems || [])
    .map((line) => buildLineItem(line))
    .filter((line): line is ReceiptLineItem => Boolean(line));

  const subtotal = parseMoney(
    input.subtotal ?? lineItems.reduce((sum, line) => sum + line.totalPrice, 0)
  );
  const tax = parseMoney(input.tax ?? 0);
  const tip = parseMoney(input.tip ?? 0);
  const total = parseMoney(input.total ?? roundMoney(subtotal + tax + tip));

  const warnings = Array.isArray(input.warnings)
    ? input.warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    : [];

  if (!lineItems.length) {
    warnings.push('Groq could not confidently extract line items. Please review manually.');
  }

  return {
    merchant,
    receiptDate,
    currency,
    subtotal,
    tax,
    tip,
    total,
    lineItems,
    warnings,
  };
}

export class GroqError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
  }
}

export async function parseReceiptWithGroq(rawText: string): Promise<ReceiptDraft> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqError('GROQ_API_KEY is not configured');
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const systemPrompt = [
    'You are an expert receipt parser.',
    'Extract structured data from receipt text.',
    'Return ONLY valid JSON, no markdown formatting.',
    'Extract ONLY actual purchased items, NOT payment summary rows.',
    'Ignore rows for: Total, Amount Paid, UPI, Card, Cash, Change, Txn ID, Balance, Invoice#, Thank you',
    'For each item include: name, qty (default 1), unitPrice, totalPrice, confidence (0.0-1.0).',
    'Return warnings array with any parsing issues.',
  ].join(' ');

  const userPrompt = [
    'Parse this receipt as JSON:',
    '{',
    '  "merchant": "string",',
    '  "receiptDate": "YYYY-MM-DD",',
    '  "currency": "INR",',
    '  "subtotal": number,',
    '  "tax": number,',
    '  "tip": number,',
    '  "total": number,',
    '  "lineItems": [{"name": "string", "qty": number, "unitPrice": number, "totalPrice": number, "confidence": number}],',
    '  "warnings": ["string"]',
    '}',
    '',
    'Receipt text:',
    rawText,
  ].join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new GroqError(`Groq request failed: ${response.status} ${text.slice(0, 200)}`, response.status);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new GroqError('Groq returned empty content');
  }

  // Extract JSON from potential markdown code blocks or extra text
  let jsonString = content.trim();
  
  // Remove markdown code blocks if present
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  // Find JSON object or array in the response
  const jsonStart = jsonString.search(/[{\[]/);
  if (jsonStart !== -1) {
    jsonString = jsonString.slice(jsonStart);
    // Find the last closing brace or bracket
    const lastBrace = Math.max(jsonString.lastIndexOf('}'), jsonString.lastIndexOf(']'));
    if (lastBrace !== -1) {
      jsonString = jsonString.slice(0, lastBrace + 1);
    }
  }

  let parsed: GroqReceiptResponse;
  try {
    parsed = JSON.parse(jsonString) as GroqReceiptResponse;
  } catch (parseError) {
    console.warn('Groq JSON parse failed. Raw content:', content.slice(0, 500));
    throw new GroqError('Groq returned invalid JSON');
  }

  return sanitizeDraft(parsed);
}
