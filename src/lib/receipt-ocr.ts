interface OcrSpaceResult {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[];
  ParsedResults?: Array<{
    ParsedText?: string;
  }>;
}

export async function extractReceiptTextFromImage(file: File): Promise<string> {
  const key = process.env.OCR_SPACE_API_KEY || 'helloworld';

  const form = new FormData();
  form.append('apikey', key);
  form.append('language', 'eng');
  form.append('isTable', 'true');
  form.append('OCREngine', '2');
  form.append('file', file, file.name || 'receipt.jpg');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`OCR provider failed with status ${response.status}`);
  }

  const result = (await response.json()) as OcrSpaceResult;
  if (result.IsErroredOnProcessing) {
    const message = result.ErrorMessage?.join(', ') || 'OCR provider could not parse the image';
    throw new Error(message);
  }

  const text = result.ParsedResults?.map((entry) => entry.ParsedText || '').join('\n') || '';
  if (!text.trim()) {
    throw new Error('OCR provider returned empty text');
  }

  return text;
}
