import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const cv = await prisma.cv.findFirst({
    where: { id, userId: session.user.id },
    select: {
      fileName: true,
      mimeType: true,
      fileBytes: true,
    },
  });

  if (!cv) {
    return new Response("Not found", { status: 404 });
  }

  const fallback = cv.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(cv.fileName);

  return new Response(new Uint8Array(cv.fileBytes), {
    headers: {
      "Content-Type": cv.mimeType,
      "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`,
      "Content-Length": String(cv.fileBytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
