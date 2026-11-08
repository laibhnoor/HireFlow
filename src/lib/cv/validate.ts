import { CvUploadError, MAX_CV_BYTES, type CvFileKind } from "@/lib/cv/types";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK..

export const CANONICAL_MIME: Record<CvFileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

export function hasMagic(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

export function extensionOf(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? `.${match[1].toLowerCase()}` : "";
}

/**
 * Determines the real file kind from magic bytes first, extension second.
 * A `.txt` containing PDF bytes is a PDF, and a renamed binary is rejected.
 */
export function detectCvKind(fileName: string, bytes: Uint8Array): CvFileKind {
  const extension = extensionOf(fileName);

  if (hasMagic(bytes, PDF_MAGIC)) return "pdf";
  if (hasMagic(bytes, ZIP_MAGIC)) {
    if (extension === ".docx" || extension === "" || extension === ".zip") {
      return "docx";
    }
    throw new CvUploadError(415, "That file looks like a ZIP archive, not a CV.");
  }

  if (extension === ".doc") {
    throw new CvUploadError(
      415,
      "Legacy .doc files aren't supported. Save your CV as PDF or DOCX and try again.",
    );
  }

  if ([".txt", ".md"].includes(extension) || extension === "") {
    if (looksLikeText(bytes)) return "txt";
  }

  throw new CvUploadError(
    415,
    "Unsupported file type. Upload a PDF, DOCX, TXT or MD file.",
  );
}

function looksLikeText(bytes: Uint8Array) {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.length === 0) return false;

  let control = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) control += 1;
  }
  return control / sample.length < 0.02;
}

export function assertFileSize(bytes: Uint8Array) {
  if (bytes.byteLength === 0) {
    throw new CvUploadError(400, "That file is empty.");
  }
  if (bytes.byteLength > MAX_CV_BYTES) {
    throw new CvUploadError(413, "CVs must be 10 MB or smaller.");
  }
}

export function deriveTitle(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const cleaned = base.replace(/\s+/g, " ").slice(0, 120);
  return cleaned || "Untitled CV";
}

export function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "-")
    .trim();
  return cleaned.slice(0, 180) || "cv";
}
