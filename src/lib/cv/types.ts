export type CvSection = {
  name: string;
  content: string;
};

export type ParsedCv = {
  sections: CvSection[];
  wordCount: number;
  charCount: number;
  extractor: CvFileKind;
};

export type CvChunkDraft = {
  ordinal: number;
  section: string;
  content: string;
  tokenCount: number;
};

export type CvFileKind = "pdf" | "docx" | "txt";

export const MAX_CV_BYTES = 10 * 1024 * 1024;

export class CvUploadError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CvUploadError";
  }
}
