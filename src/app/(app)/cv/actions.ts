"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export async function setPrimaryCvAction(formData: FormData) {
  const user = await requireUser();
  const cvId = String(formData.get("cvId") ?? "");
  if (!cvId) return;

  const owned = await prisma.cv.findFirst({
    where: { id: cvId, userId: user.id },
    select: { id: true },
  });
  if (!owned) return;

  await prisma.$transaction([
    prisma.cv.updateMany({
      where: { userId: user.id, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.cv.update({
      where: { id: owned.id },
      data: { isPrimary: true },
    }),
  ]);

  revalidatePath("/cv");
  revalidatePath(`/cv/${owned.id}`);
}

export async function deleteCvAction(formData: FormData) {
  const user = await requireUser();
  const cvId = String(formData.get("cvId") ?? "");
  const fromDetail = formData.get("fromDetail") === "1";
  if (!cvId) return;

  const cv = await prisma.cv.findFirst({
    where: { id: cvId, userId: user.id },
    select: { id: true, isPrimary: true },
  });
  if (!cv) return;

  const usedBy = await prisma.application.count({ where: { cvId: cv.id } });
  if (usedBy > 0) {
    redirect(`/cv?error=cv-in-use&count=${usedBy}`);
  }

  await prisma.cv.delete({ where: { id: cv.id } });

  if (cv.isPrimary) {
    const next = await prisma.cv.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (next) {
      await prisma.cv.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  revalidatePath("/cv");
  if (fromDetail) redirect("/cv");
}
