import { ReceiptDraft, ReceiptLineItem } from './types';
import { parseMoney, roundMoney } from './utils';

export type ReceiptAiErrorCode =
  | 'missing_api_key'
  | 'quota_exceeded'
  | 'provider_error'
  | 'invalid_response';

export class ReceiptAiError extends Error {
  code: ReceiptAiErrorCode;
  status?: number;
  retryAfterSeconds?: number;

  constructor(
    code: ReceiptAiErrorCode,
    message: string,
    options?: { status?: number; retryAfterSeconds?: number }
  ) {
    super(message);
    this.name = 'ReceiptAiError';
    this.code = code;
    this.status = options?.status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

function parseRetryAfterSeconds(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const seconds = Number.parseInt(raw, 10);
  if (Number.isFinite(seconds) && seconds > 0) return seconds;
  return undefined;
}

interface GeminiLineItem {
  name?: string;
  qty?: number;
  unitPrice?: number;
  totalPrice?: number;
  confidence?: number;
}

interface GeminiReceiptResponse {
  merchant?: string;
  receiptDate?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  lineItems?: GeminiLineItem[];
  warnings?: string[];
}

function buildLineItem(item: GeminiLineItem): ReceiptLineItem | null {
  const name = (item.name || '').trim();
  if (!name) return null;

  const totalPrice = parseMoney(item.totalPrice ?? 0);
  const qty = Number.isFinite(item.qty) && (item.qty as number) > 0 ? Number(item.qty) : 1;
  const unitPrice = parseMoney(item.unitPrice ?? (qty > 0 ? totalPrice / qty : totalPrice));
  const confidence = Number.isFinite(item.confidence) ? Number(item.confidence) : 0.75;

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

function sanitizeDraft(input: GeminiReceiptResponse): ReceiptDraft {
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
    warnings.push('AI could not confidently extract line items. Please review manually.');
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

export async function parseReceiptWithGemini(rawText: string): Promise<ReceiptDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ReceiptAiError('missing_api_key', 'GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = [
    'You are a receipt parser. Return ONLY valid JSON.',
    'Extract only real purchased items in lineItems.',
    'Do NOT include payment summary rows such as Total, Amount Paid, UPI, Card, Cash, Change, Balance, Txn ID, GST lines in lineItems.',
    'Use this JSON shape:',
    '{',
    '  "merchant": "string",',
    '  "receiptDate": "YYYY-MM-DD or original date string",',
    '  "currency": "INR",',
    '  "subtotal": number,',
    '  "tax": number,',
    '  "tip": number,',
    '  "total": number,',
    '  "lineItems": [{"name": "string", "qty": number, "unitPrice": number, "totalPrice": number, "confidence": number}],',
    '  "warnings": ["string"]',
    '}',
    'If missing values, use 0 for numeric fields and include warning entries.',
    'Receipt OCR text:',
    rawText,
  ].join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));

    if (response.status === 429) {
      throw new ReceiptAiError(
        'quota_exceeded',
        `Gemini quota exceeded (${response.status}). Falling back to parser.`,
        { status: response.status, retryAfterSeconds }
      );
    }

    throw new ReceiptAiError(
      'provider_error',
      `Gemini request failed (${response.status}): ${message.slice(0, 400)}`,
      { status: response.status, retryAfterSeconds }
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new ReceiptAiError('invalid_response', 'Gemini returned empty content');
  }

  let parsed: GeminiReceiptResponse;
  try {
    parsed = JSON.parse(text) as GeminiReceiptResponse;
  } catch {
    throw new ReceiptAiError('invalid_response', 'Gemini returned invalid JSON');
  }

  return sanitizeDraft(parsed);
}
