-- Expand/contract: add competitor-parity GPLX features (bookmarks, streak, fixed sets, mock mode).

-- AlterTable
ALTER TABLE "GplxMockAttempt" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'random';
ALTER TABLE "GplxMockAttempt" ADD COLUMN IF NOT EXISTS "fixedSetId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GplxFixedSet" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "licenseClass" TEXT NOT NULL,
    "questionIdsJson" JSONB NOT NULL DEFAULT '[]',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GplxFixedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GplxBookmark" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GplxBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GplxStudyStreak" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GplxStudyStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GplxFixedSet_appId_code_key" ON "GplxFixedSet"("appId", "code");
CREATE INDEX IF NOT EXISTS "GplxFixedSet_appId_licenseClass_position_idx" ON "GplxFixedSet"("appId", "licenseClass", "position");

CREATE UNIQUE INDEX IF NOT EXISTS "GplxBookmark_userId_questionId_key" ON "GplxBookmark"("userId", "questionId");
CREATE INDEX IF NOT EXISTS "GplxBookmark_appId_userId_createdAt_idx" ON "GplxBookmark"("appId", "userId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "GplxStudyStreak_appId_userId_key" ON "GplxStudyStreak"("appId", "userId");
CREATE INDEX IF NOT EXISTS "GplxStudyStreak_appId_userId_idx" ON "GplxStudyStreak"("appId", "userId");

CREATE INDEX IF NOT EXISTS "GplxMockAttempt_fixedSetId_idx" ON "GplxMockAttempt"("fixedSetId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GplxMockAttempt" ADD CONSTRAINT "GplxMockAttempt_fixedSetId_fkey"
    FOREIGN KEY ("fixedSetId") REFERENCES "GplxFixedSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GplxFixedSet" ADD CONSTRAINT "GplxFixedSet_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GplxBookmark" ADD CONSTRAINT "GplxBookmark_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GplxBookmark" ADD CONSTRAINT "GplxBookmark_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GplxBookmark" ADD CONSTRAINT "GplxBookmark_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "GplxBankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GplxStudyStreak" ADD CONSTRAINT "GplxStudyStreak_appId_fkey"
    FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GplxStudyStreak" ADD CONSTRAINT "GplxStudyStreak_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
