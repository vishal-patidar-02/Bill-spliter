import { ReceiptDraft, ReceiptLineItem } from './types';
import { parseMoney, roundMoney } from './utils';

function isSummaryOrPaymentLine(lower: string): boolean {
  return /\b(subtotal|total|grand total|amount due|amount paid|net amount|round off|discount|tax|vat|gst|cgst|sgst|tip|service charge|payment|paid via|upi|card|cash|debit|credit|change|balance)\b/.test(lower);
}

function amountsEqual(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) <= 0.01;
}

function extractAmount(line: string): number {
  const matches = line.match(/(\d+[\d,]*[.]\d{2})/g);
  if (!matches || matches.length === 0) return 0;
  return parseMoney(matches[matches.length - 1]);
}

function extractDate(text: string): string {
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}[/-]\d{2}[/-]\d{4})/,
    /(\d{2}[/-]\d{2}[/-]\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return new Date().toISOString().slice(0, 10);
}

function buildLineItem(name: string, totalPrice: number): ReceiptLineItem {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `line-${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    name,
    qty: 1,
    unitPrice: totalPrice,
    totalPrice,
    confidence: 0.7,
    include: true,
  };
}

export function parseReceiptText(rawText: string): ReceiptDraft {
  const text = rawText || '';
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const merchant = lines[0] || 'Receipt';
  const receiptDate = extractDate(text);

  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let total = 0;

  const lineItems: ReceiptLineItem[] = [];

  // First pass: extract totals and summary values.
  for (const line of lines) {
    const lower = line.toLowerCase();
    const amount = extractAmount(line);
    if (amount <= 0) continue;

    if (/\bsubtotal\b/.test(lower)) {
      subtotal = amount;
      continue;
    }
    if (/\b(tax|vat|gst|cgst|sgst)\b/.test(lower)) {
      tax += amount;
      continue;
    }
    if (/\btip\b/.test(lower)) {
      tip = amount;
      continue;
    }
    if (/\b(total|grand total|amount due)\b/.test(lower)) {
      total = Math.max(total, amount);
    }
  }

  // Second pass: extract product/service line items.
  for (const line of lines) {
    const lower = line.toLowerCase();
    const amount = extractAmount(line);
    if (amount <= 0) continue;

    if (isSummaryOrPaymentLine(lower)) continue;

    // Guard: if line amount equals detected total, it is likely a payment summary row.
    if (total > 0 && amountsEqual(amount, total)) continue;

    if (/\b(qty|quantity|invoice|phone|date|time|table|token|order|bill no)\b/.test(lower)) {
      continue;
    }

    const cleanedName = line
      .replace(/(\d+[\d,]*[.]\d{2})/g, '')
      .replace(/[xX]\s*\d+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!cleanedName || cleanedName.length < 2) continue;
    lineItems.push(buildLineItem(cleanedName, amount));
  }

  if (!subtotal && lineItems.length > 0) {
    subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.totalPrice, 0));
  }

  if (!total) {
    total = roundMoney(subtotal + tax + tip);
  }

  const warnings: string[] = [];
  if (!lineItems.length) {
    lineItems.push(buildLineItem('Receipt item', total || subtotal || 0));
    warnings.push('No line items were confidently extracted. Please review values manually.');
  }
  if (!total || total <= 0) {
    warnings.push('Could not detect receipt total. Enter the total manually before saving.');
  }

  return {
    merchant,
    receiptDate,
    currency: 'INR',
    subtotal: roundMoney(subtotal),
    tax: roundMoney(tax),
    tip: roundMoney(tip),
    total: roundMoney(total),
    lineItems,
    warnings,
  };
}
