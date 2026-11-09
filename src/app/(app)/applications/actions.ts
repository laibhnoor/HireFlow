"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth-guards";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
} from "@/lib/applications/status";
import { prisma } from "@/lib/db";
import { analyzeJob } from "@/lib/jobs/analyze";
import {
  AnalysisError,
  EMPLOYMENT_TYPES,
  type AnalyzeJobState,
} from "@/lib/jobs/types";

const schema = z.object({
  cvId: z.string().min(1, "Choose a CV to analyse."),
  company: z
    .string()
    .trim()
    .min(1, "Add the company name.")
    .max(120, "Company name is too long."),
  title: z
    .string()
    .trim()
    .min(1, "Add the job title.")
    .max(160, "Job title is too long."),
  location: z.string().trim().max(120, "Location is too long.").optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional().or(z.literal("")),
  url: z
    .union([z.string().trim().url("Enter a valid job URL."), z.literal("")])
    .optional(),
  description: z
    .string()
    .trim()
    .min(
      80,
      "Paste at least a few sentences of the job description (80 characters minimum).",
    )
    .max(40_000, "That job description is too long. Trim it to 40,000 characters."),
});

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function analyzeJobAction(
  _previous: AnalyzeJobState,
  formData: FormData,
): Promise<AnalyzeJobState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    cvId: field(formData, "cvId"),
    company: field(formData, "company"),
    title: field(formData, "title"),
    location: field(formData, "location") || undefined,
    employmentType: field(formData, "employmentType") || undefined,
    url: field(formData, "url") || undefined,
    description: field(formData, "description"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check the form and try again.",
    };
  }

  let applicationId: string;
  try {
    const result = await analyzeJob(user.id, parsed.data);
    applicationId = result.applicationId;
  } catch (error) {
    if (error instanceof AnalysisError) {
      return { error: error.message };
    }
    console.error("[jobs] analysis action failed", error);
    return {
      error:
        "Something went wrong while analysing that job. Try again in a moment.",
    };
  }

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirect(`/applications/${applicationId}`);
}

const statusSchema = z.enum(APPLICATION_STATUSES);

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Moves an application through the tracker pipeline. Every change writes an
 * ApplicationEvent so the timeline stays a real audit trail.
 */
export async function updateApplicationStatusAction(
  applicationId: string,
  status: string,
): Promise<UpdateStatusResult> {
  const user = await requireUser();
  const parsed = statusSchema.safeParse(status);

  if (!parsed.success) {
    return { ok: false, error: "Choose a valid application status." };
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    select: { id: true, status: true, appliedAt: true },
  });

  if (!application) {
    return { ok: false, error: "That application could not be found." };
  }

  if (application.status === parsed.data) {
    return { ok: true };
  }

  const nextStatus = parsed.data;
  const appliedAt =
    application.appliedAt ??
    (nextStatus !== "SAVED" ? new Date() : null);

  try {
    await prisma.$transaction([
      prisma.application.update({
        where: { id: application.id },
        data: { status: nextStatus, appliedAt },
      }),
      prisma.applicationEvent.create({
        data: {
          applicationId: application.id,
          type: "STATUS_CHANGED",
          note: `${STATUS_LABELS[application.status as keyof typeof STATUS_LABELS] ?? application.status} → ${STATUS_LABELS[nextStatus]}`,
        },
      }),
    ]);
  } catch (error) {
    console.error("[tracker] status update failed", error);
    return {
      ok: false,
      error: "The status could not be saved. Try again.",
    };
  }

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath(`/applications/${application.id}`);

  return { ok: true };
}
