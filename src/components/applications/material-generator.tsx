"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Loader2,
  Map,
  MessagesSquare,
  PenLine,
  RefreshCw,
  Sparkles,
  Square,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { MaterialMarkdown } from "@/components/applications/material-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPHASIS_LABELS,
  HORIZON_LABELS,
  INTERVIEW_FOCUS_LABELS,
  INTERVIEW_FOCUSES,
  LENGTH_LABELS,
  MATERIAL_EMPHASES,
  MATERIAL_LENGTHS,
  MATERIAL_TONES,
  ROADMAP_HORIZONS,
  TONE_LABELS,
  type InterviewFocus,
  type MaterialEmphasis,
  type MaterialLength,
  type MaterialTone,
  type MaterialType,
  type RoadmapHorizon,
} from "@/lib/generation/types";
import { cn, formatDate } from "@/lib/utils";

export type MaterialDocView = {
  id: string;
  type: MaterialType;
  title: string;
  content: string;
  version: number;
  model: string;
  promptVersion: string;
  createdAt: string;
};

type DoneInfo = {
  docId: string;
  version: number;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
};

type MaterialUi = {
  label: string;
  emptyTitle: string;
  emptyBody: string;
  settingsTitle: string;
  settingsBody: string;
  generateLabel: string;
  fileBase: string;
  extension: string;
  icon: LucideIcon;
  markdown: boolean;
};

const UI: Record<MaterialType, MaterialUi> = {
  COVER_LETTER: {
    label: "Cover letter",
    emptyTitle: "No cover letter yet",
    emptyBody:
      "Generate a letter grounded in the evidence behind this analysis.",
    settingsTitle: "Letter settings",
    settingsBody:
      "Generated from this analysis, the job description and cited CV passages.",
    generateLabel: "Generate cover letter",
    fileBase: "cover-letter",
    extension: "txt",
    icon: PenLine,
    markdown: false,
  },
  CV_SUGGESTIONS: {
    label: "CV suggestions",
    emptyTitle: "No suggestions yet",
    emptyBody:
      "Generate requirement-by-requirement edits, with draft bullets clearly marked for verification.",
    settingsTitle: "Suggestion settings",
    settingsBody:
      "Covers every partial and missing requirement, prioritising must-haves.",
    generateLabel: "Generate suggestions",
    fileBase: "cv-suggestions",
    extension: "md",
    icon: Sparkles,
    markdown: true,
  },
  ROADMAP: {
    label: "Skill-gap roadmap",
    emptyTitle: "No roadmap yet",
    emptyBody:
      "Turn the gaps into a dated plan with the evidence each step should produce.",
    settingsTitle: "Roadmap settings",
    settingsBody:
      "Sequences missing must-haves first, then adjacent evidence and nice-to-haves.",
    generateLabel: "Generate roadmap",
    fileBase: "skill-gap-roadmap",
    extension: "md",
    icon: Map,
    markdown: true,
  },
  INTERVIEW_PREP: {
    label: "Interview preparation",
    emptyTitle: "No interview prep yet",
    emptyBody:
      "Generate likely questions, STAR outlines from your evidence, and honest gap scripts.",
    settingsTitle: "Interview settings",
    settingsBody:
      "Questions come from this analysis; gaps get a truthful script, not an invented story.",
    generateLabel: "Generate interview prep",
    fileBase: "interview-prep",
    extension: "md",
    icon: MessagesSquare,
    markdown: true,
  },
};

export function MaterialGenerator({
  applicationId,
  materialType,
  docs,
  mockMode,
}: {
  applicationId: string;
  materialType: MaterialType;
  docs: MaterialDocView[];
  mockMode: boolean;
}) {
  const router = useRouter();
  const ui = UI[materialType];

  const [tone, setTone] = React.useState<MaterialTone>("professional");
  const [length, setLength] = React.useState<MaterialLength>("standard");
  const [emphasis, setEmphasis] =
    React.useState<MaterialEmphasis>("experience");
  const [horizon, setHorizon] = React.useState<RoadmapHorizon>("4_weeks");
  const [interviewFocus, setInterviewFocus] =
    React.useState<InterviewFocus>("balanced");
  const [note, setNote] = React.useState("");

  const [selectedId, setSelectedId] = React.useState<string | null>(
    docs[0]?.id ?? null,
  );
  const [content, setContent] = React.useState(docs[0]?.content ?? "");
  const [liveDoc, setLiveDoc] = React.useState<MaterialDocView | null>(null);
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const controllerRef = React.useRef<AbortController | null>(null);

  const optionDocs = React.useMemo(() => {
    if (!liveDoc || docs.some((doc) => doc.id === liveDoc.id)) return docs;
    return [liveDoc, ...docs];
  }, [docs, liveDoc]);

  const currentDoc = optionDocs.find((doc) => doc.id === selectedId) ?? null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const Icon = ui.icon;

  React.useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function generate() {
    if (streaming) return;

    setStreaming(true);
    setError(null);
    setContent("");
    setSelectedId(null);

    const controller = new AbortController();
    controllerRef.current = controller;

    let accumulated = "";
    let done: DoneInfo | null = null;

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/materials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            type: materialType,
            tone,
            length,
            emphasis,
            horizon,
            interviewFocus,
            note: materialType === "COVER_LETTER" ? note : "",
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Generation failed. Try again.");
      }

      if (!response.body) {
        throw new Error("The server returned no stream. Try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const raw = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          const event = parseEvent(raw);
          if (!event) continue;

          if (event.name === "delta") {
            const text =
              typeof event.data.text === "string" ? event.data.text : "";
            accumulated += text;
            setContent(accumulated);
          } else if (event.name === "done") {
            done = event.data as DoneInfo;
          } else if (event.name === "error") {
            throw new Error(
              typeof event.data.message === "string"
                ? event.data.message
                : "Generation failed. Try again.",
            );
          }
        }
      }

      if (!done) {
        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        throw new Error("The stream ended before the document was saved.");
      }

      setSelectedId(done.docId);
      setLiveDoc({
        id: done.docId,
        type: materialType,
        title: "",
        content: accumulated,
        version: done.version,
        model: done.model,
        promptVersion: done.promptVersion,
        createdAt: new Date().toISOString(),
      });
      router.refresh();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("Generation stopped. Nothing was saved.");
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Generation failed. Try again.",
        );
      }
    } finally {
      controllerRef.current = null;
      setStreaming(false);
    }
  }

  function stop() {
    controllerRef.current?.abort();
  }

  function selectDoc(id: string) {
    const doc = optionDocs.find((item) => item.id === id);
    setSelectedId(id);
    setContent(doc?.content ?? "");
    setError(null);
  }

  async function copy() {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy to the clipboard. Select the text instead.");
    }
  }

  function download() {
    if (!content) return;
    const version = currentDoc?.version ?? 1;
    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ui.fileBase}-v${version}.${ui.extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
      <section className="order-2 lg:order-1">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <h2 className="truncate text-sm font-semibold">{ui.label}</h2>
              {currentDoc ? (
                <Badge variant="secondary">v{currentDoc.version}</Badge>
              ) : null}
              {streaming ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Writing…
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              {optionDocs.length > 0 ? (
                <Select
                  aria-label="Document version"
                  className="h-8 w-auto min-w-28 text-xs"
                  value={selectedId ?? ""}
                  onChange={(event) => selectDoc(event.target.value)}
                  disabled={streaming}
                >
                  {selectedId === null ? (
                    <option value="">New generation</option>
                  ) : null}
                  {optionDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Version {doc.version}
                      {doc.createdAt
                        ? ` · ${formatDate(doc.createdAt)}`
                        : ""}
                    </option>
                  ))}
                </Select>
              ) : null}

              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Copy document"
                onClick={copy}
                disabled={!content || streaming}
              >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Download document"
                onClick={download}
                disabled={!content || streaming}
              >
                <Download aria-hidden />
              </Button>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6">
            {content ? (
              ui.markdown ? (
                <div>
                  <MaterialMarkdown content={content} />
                  {streaming ? <Caret /> : null}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-7">
                  {content}
                  {streaming ? <Caret /> : null}
                </div>
              )
            ) : streaming ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" aria-hidden />
                Drafting from your cited evidence…
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-semibold">{ui.emptyTitle}</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {ui.emptyBody}
                </p>
                <Button
                  type="button"
                  className="mt-4"
                  variant="outline"
                  onClick={generate}
                >
                  <Wand2 aria-hidden />
                  Generate
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>
              {wordCount} words
              {currentDoc?.model ? ` · ${currentDoc.model}` : ""}
              {currentDoc?.promptVersion
                ? ` · prompt ${currentDoc.promptVersion}`
                : ""}
            </span>
            <span>Review before using. Evidence only — verify every claim.</span>
          </div>
        </div>
      </section>

      <aside className="order-1 space-y-3 lg:order-2 lg:sticky lg:top-24">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">{ui.settingsTitle}</h2>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {ui.settingsBody}
          </p>

          {materialType === "COVER_LETTER" ? (
            <div className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    id="tone"
                    value={tone}
                    onChange={(event) =>
                      setTone(event.target.value as MaterialTone)
                    }
                    disabled={streaming}
                  >
                    {MATERIAL_TONES.map((value) => (
                      <option key={value} value={value}>
                        {TONE_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="length">Length</Label>
                  <Select
                    id="length"
                    value={length}
                    onChange={(event) =>
                      setLength(event.target.value as MaterialLength)
                    }
                    disabled={streaming}
                  >
                    {MATERIAL_LENGTHS.map((value) => (
                      <option key={value} value={value}>
                        {LENGTH_LABELS[value]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emphasis">Emphasise</Label>
                <Select
                  id="emphasis"
                  value={emphasis}
                  onChange={(event) =>
                    setEmphasis(event.target.value as MaterialEmphasis)
                  }
                  disabled={streaming}
                >
                  {MATERIAL_EMPHASES.map((value) => (
                    <option key={value} value={value}>
                      {EMPHASIS_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Personal note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Anything true you want included, e.g. a referral or your motivation."
                  disabled={streaming}
                />
                <p className="text-[11px] text-muted-foreground">
                  Only include facts you can back up.
                </p>
              </div>
            </div>
          ) : materialType === "ROADMAP" ? (
            <div className="mt-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="horizon">Plan for</Label>
                <Select
                  id="horizon"
                  value={horizon}
                  onChange={(event) =>
                    setHorizon(event.target.value as RoadmapHorizon)
                  }
                  disabled={streaming}
                >
                  {ROADMAP_HORIZONS.map((value) => (
                    <option key={value} value={value}>
                      {HORIZON_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                Missing requirements become learning steps with evidence to
                produce. They are never presented as experience you already have.
              </div>
            </div>
          ) : materialType === "INTERVIEW_PREP" ? (
            <div className="mt-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="interview-focus">Focus</Label>
                <Select
                  id="interview-focus"
                  value={interviewFocus}
                  onChange={(event) =>
                    setInterviewFocus(event.target.value as InterviewFocus)
                  }
                  disabled={streaming}
                >
                  {INTERVIEW_FOCUSES.map((value) => (
                    <option key={value} value={value}>
                      {INTERVIEW_FOCUS_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                Matched evidence becomes STAR outlines. Missing requirements get
                an honest gap script instead of an invented story.
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              Suggestions never invent experience. Missing requirements get a
              learning action instead of a draft bullet.
            </div>
          )}

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            <Button
              type="button"
              className="w-full"
              onClick={generate}
              disabled={streaming}
            >
              {streaming ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Generating…
                </>
              ) : docs.length > 0 || liveDoc ? (
                <>
                  <RefreshCw aria-hidden />
                  Generate new version
                </>
              ) : (
                <>
                  <Wand2 aria-hidden />
                  {ui.generateLabel}
                </>
              )}
            </Button>

            {streaming ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={stop}
              >
                <Square aria-hidden />
                Stop
              </Button>
            ) : null}
          </div>

          {mockMode ? (
            <p className="mt-3 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Demo mode: documents use the local deterministic generator. Add an
              OpenAI key for model-quality writing.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Evidence guardrail</p>
          <p className="mt-1">
            The prompt only receives matched and partial requirements with their
            cited CV passages. Missing requirements are framed as goals, never as
            experience.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Caret() {
  return (
    <span
      className={cn(
        "ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-primary align-middle",
      )}
      aria-hidden
    />
  );
}

function parseEvent(raw: string): { name: string; data: Record<string, unknown> } | null {
  let name = "message";
  const data: string[] = [];

  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      name = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    }
  }

  if (data.length === 0) return null;

  try {
    return { name, data: JSON.parse(data.join("\n")) };
  } catch {
    return null;
  }
}
