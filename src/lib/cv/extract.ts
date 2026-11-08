import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

import { CvUploadError, type CvFileKind } from "@/lib/cv/types";

export async function extractCvText(
  kind: CvFileKind,
  bytes: Uint8Array,
): Promise<string> {
  try {
    let raw: string;

    if (kind === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await extractText(pdf, { mergePages: true });
      raw = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    } else if (kind === "docx") {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      raw = result.value;
    } else {
      raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }

    return normalizeText(raw);
  } catch (error) {
    if (error instanceof CvUploadError) throw error;
    console.error("[cv] text extraction failed", error);
    throw new CvUploadError(
      422,
      "We couldn't read text from that file. If it's a scanned PDF, export a text-based version and upload again.",
    );
  }
}

export function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
