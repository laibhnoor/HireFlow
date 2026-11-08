"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatBytes } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.txt,.md";
const ALLOWED = [".pdf", ".docx", ".txt", ".md"];

type Status = "idle" | "uploading" | "processing" | "success" | "error";

export function CvUploader({ mockMode }: { mockMode: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const busy = status === "uploading" || status === "processing";

  function choose(next: File | null) {
    if (!next) return;

    const extension = `.${next.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ALLOWED.includes(extension)) {
      setStatus("error");
      setMessage("Choose a PDF, DOCX, TXT or MD file.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setStatus("error");
      setMessage("That file is larger than 10 MB.");
      return;
    }

    setFile(next);
    setStatus("idle");
    setProgress(0);
    setMessage(null);
  }

  function reset() {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function upload() {
    if (!file || busy) return;

    setStatus("uploading");
    setProgress(0);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/cv");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setProgress(percent);
      if (percent >= 100) setStatus("processing");
    };

    xhr.onload = () => {
      let payload: { error?: string; chunkCount?: number } | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as {
          error?: string;
          chunkCount?: number;
        };
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus("success");
        setProgress(100);
        setMessage(
          payload?.chunkCount
            ? `CV added — ${payload.chunkCount} passages indexed.`
            : "CV added and indexed.",
        );
        setFile(null);
        router.refresh();
      } else {
        setStatus("error");
        setMessage(payload?.error ?? "Upload failed. Try again.");
      }
    };

    xhr.onerror = () => {
      setStatus("error");
      setMessage("Network error while uploading. Check your connection and try again.");
    };

    xhr.send(formData);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Add a CV</CardTitle>
          <CardDescription>
            PDF, DOCX, TXT or MD · up to 10 MB. Text is extracted and indexed
            privately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                choose(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/30",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                disabled={busy}
                onChange={(event) => choose(event.target.files?.[0] ?? null)}
              />
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <CloudUpload className="size-5" aria-hidden />
              </span>
              <span className="mt-3 text-sm font-medium">
                Drop your CV here
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                or click to browse
              </span>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={reset}
                  disabled={busy}
                  aria-label="Remove file"
                >
                  <X aria-hidden />
                </Button>
              </div>

              {busy ? (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    {status === "processing"
                      ? "Reading your CV and building the search index…"
                      : `Uploading… ${progress}%`}
                  </p>
                </div>
              ) : (
                <Button type="button" className="w-full" onClick={upload}>
                  <CloudUpload aria-hidden />
                  Upload and index
                </Button>
              )}
            </div>
          )}

          {message ? (
            <div
              role="status"
              className={cn(
                "mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
                status === "error"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-success/30 bg-success/5 text-success",
              )}
            >
              {status === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <span>{message}</span>
            </div>
          ) : null}

          {status === "success" ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={reset}
            >
              Add another CV
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">For the best extraction</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>Use a text-based PDF, not a scan or photo.</li>
          <li>Keep standard headings: Experience, Education, Skills, Projects.</li>
          <li>One column parses more reliably than a designed layout.</li>
        </ul>
        {mockMode ? (
          <p className="mt-2 border-t border-border/60 pt-2">
            Demo mode: embeddings are generated locally. Add an OpenAI key for
            semantic retrieval quality.
          </p>
        ) : null}
      </div>
    </div>
  );
}
