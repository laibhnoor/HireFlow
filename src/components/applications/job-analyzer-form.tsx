"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import { analyzeJobAction } from "@/app/(app)/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPLOYMENT_TYPES, type AnalyzeJobState } from "@/lib/jobs/types";

const initialState: AnalyzeJobState = {};

export function JobAnalyzerForm({
  cvs,
  defaultCvId,
}: {
  cvs: Array<{ id: string; title: string; isPrimary: boolean }>;
  defaultCvId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    analyzeJobAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="cvId">CV to analyse</Label>
        <Select
          id="cvId"
          name="cvId"
          defaultValue={defaultCvId ?? cvs[0]?.id}
          disabled={pending}
          required
        >
          {cvs.map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.title}
              {cv.isPrimary ? " (primary)" : ""}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          Only processed CVs with indexed passages can be scored.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            name="company"
            placeholder="Northwind Labs"
            maxLength={120}
            disabled={pending}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Senior Frontend Engineer"
            maxLength={160}
            disabled={pending}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="London, UK or Remote"
            maxLength={120}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employmentType">Employment type</Label>
          <Select
            id="employmentType"
            name="employmentType"
            defaultValue=""
            disabled={pending}
          >
            <option value="">Not specified</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">Job URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://company.com/jobs/123"
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Job description</Label>
        <Textarea
          id="description"
          name="description"
          rows={14}
          minLength={80}
          maxLength={40_000}
          placeholder={
            "Paste the full job description here.\n\nRequirements, responsibilities and nice-to-haves all help. Company blurb and benefits are ignored."
          }
          className="min-h-56 resize-y leading-relaxed"
          disabled={pending}
          required
        />
        <p className="text-xs text-muted-foreground">
          Minimum 80 characters. Bullet lists parse best.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Extracting requirements and scoring evidence…
          </>
        ) : (
          <>
            <Sparkles aria-hidden />
            Analyse match
          </>
        )}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        The score is computed from a published rubric. Every matched or partial
        requirement must cite a passage from your CV.
      </p>
    </form>
  );
}
