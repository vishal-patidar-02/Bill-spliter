import { NextResponse } from 'next/server';
import { extractReceiptTextFromImage } from '@/lib/receipt-ocr';
import { parseReceiptText } from '@/lib/receipt-parse';
import { parseReceiptWithGroq, GroqError } from '@/lib/receipt-groq';

export const runtime = 'nodejs';

let groqCooldownUntilMs = 0;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Receipt image file is required.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are supported.' }, { status: 400 });
    }

    try {
      const text = await extractReceiptTextFromImage(file);
      let draft = parseReceiptText(text);
      let aiUsed = false;

      const now = Date.now();
      if (process.env.GROQ_API_KEY && now >= groqCooldownUntilMs) {
        try {
          draft = await parseReceiptWithGroq(text);
          aiUsed = true;
          console.info('Receipt parsed with Groq AI (free tier).');
        } catch (groqError) {
          console.warn('Groq parse failed:', groqError);
          if (groqError instanceof GroqError && groqError.status === 429) {
            groqCooldownUntilMs = Date.now() + 60000;
          }
        }
      }

      if (!aiUsed && !process.env.GROQ_API_KEY) {
        draft.warnings = [
          ...draft.warnings,
          'No AI provider configured. Using standard rule-based parser.',
        ];
      }

      return NextResponse.json({ draft, degraded: false });
    } catch (ocrError) {
      console.error('OCR failed, returning manual draft fallback:', ocrError);

      const fallback = parseReceiptText('');
      fallback.merchant = file.name?.replace(/\.[a-zA-Z0-9]+$/, '') || 'Receipt';
      fallback.warnings = [
        'OCR failed for this image. Fill in receipt details manually and save.',
      ];

      return NextResponse.json({
        draft: fallback,
        degraded: true,
      });
    }
  } catch (error) {
    console.error('Receipt parse route failed:', error);
    return NextResponse.json(
      { error: 'Failed to parse receipt.' },
      { status: 500 }
    );
  }
}
