import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { loadMaterialContext } from "@/lib/generation/context";
import { streamMaterial } from "@/lib/generation/generate";
import { saveGeneratedMaterial } from "@/lib/generation/persist";
import {
  INTERVIEW_FOCUSES,
  MATERIAL_EMPHASES,
  MATERIAL_LENGTHS,
  MATERIAL_TONES,
  MATERIAL_TYPES,
  MaterialError,
  ROADMAP_HORIZONS,
  type MaterialOptions,
} from "@/lib/generation/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  type: z.enum(MATERIAL_TYPES),
  tone: z.enum(MATERIAL_TONES).optional().default("professional"),
  length: z.enum(MATERIAL_LENGTHS).optional().default("standard"),
  emphasis: z.enum(MATERIAL_EMPHASES).optional().default("experience"),
  horizon: z.enum(ROADMAP_HORIZONS).optional().default("4_weeks"),
  interviewFocus: z
    .enum(INTERVIEW_FOCUSES)
    .optional()
    .default("balanced"),
  note: z.string().trim().max(500, "Keep the note under 500 characters.").optional().default(""),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Check the generation options and try again.",
      },
      { status: 400 },
    );
  }

  let context;
  try {
    context = await loadMaterialContext(userId, id);
  } catch (error) {
    if (error instanceof MaterialError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[generation] failed to load context", error);
    return NextResponse.json(
      { error: "Could not load this application." },
      { status: 500 },
    );
  }

  const options: MaterialOptions = parsed.data;
  const encoder = new TextEncoder();
  let aborted = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (aborted) return false;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
          return true;
        } catch {
          aborted = true;
          return false;
        }
      };

      let accumulated = "";

      try {
        const material = await streamMaterial(
          context,
          options,
          request.signal,
        );

        for await (const chunk of material.stream) {
          if (request.signal.aborted) {
            aborted = true;
            break;
          }
          accumulated += chunk;
          if (!send("delta", { text: chunk })) break;
        }

        if (aborted || request.signal.aborted) return;

        const content = accumulated.trim();
        if (!content) {
          send("error", {
            message: "The model returned an empty document. Try again.",
          });
          return;
        }

        const usage = material.getUsage();
        const saved = await saveGeneratedMaterial({
          userId,
          applicationId: context.applicationId,
          type: options.type,
          content,
          model: material.model,
          promptVersion: material.promptVersion,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });

        send("done", {
          docId: saved.id,
          version: saved.version,
          model: material.model,
          promptVersion: material.promptVersion,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });
      } catch (error) {
        console.error("[generation] streaming failed", error);
        send("error", {
          message:
            "Generation stopped unexpectedly. Nothing was saved — try again.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // The client may have already disconnected.
        }
      }
    },
    cancel() {
      aborted = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
