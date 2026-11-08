import { auth } from "@/auth";
import { ingestCv } from "@/lib/cv/ingest";
import { CvUploadError, MAX_CV_BYTES } from "@/lib/cv/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "Sign in to upload a CV." },
      { status: 401 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CV_BYTES + 512 * 1024) {
    return Response.json(
      { error: "CVs must be 10 MB or smaller." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Invalid upload. Send the CV as multipart form data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "Choose a CV file to upload." }, { status: 400 });
  }

  try {
    const result = await ingestCv(session.user.id, file as File);
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CvUploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[api/cv] upload failed", error);
    return Response.json(
      { error: "Something went wrong while processing that CV. Try again." },
      { status: 500 },
    );
  }
}
