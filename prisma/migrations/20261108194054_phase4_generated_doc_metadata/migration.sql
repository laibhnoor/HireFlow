-- AlterTable
ALTER TABLE "GeneratedDoc" ADD COLUMN     "inputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promptVersion" TEXT NOT NULL DEFAULT '';
