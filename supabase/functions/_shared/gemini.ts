// Gemini REST client for the cheap, high-volume extraction work (reading
// roster photos, PDFs and spreadsheets). Returns parsed JSON constrained by
// a response schema.
import { GEMINI_MODEL, optEnv } from './config.ts';

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export async function geminiJson<T>(parts: GeminiPart[], responseSchema: Record<string, unknown>, system?: string): Promise<T> {
  const key = optEnv('GEMINI_API_KEY') ?? '';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema, thinkingConfig: { thinkingLevel: 'low' } },
      }),
    },
  );
  const raw = await res.text();
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini ${res.status}: ${raw.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${j.error?.message ?? 'request failed'}`);
  const text: string = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error(`Gemini returned no content (finishReason: ${j.candidates?.[0]?.finishReason ?? 'none'})`);
  return JSON.parse(text) as T;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
