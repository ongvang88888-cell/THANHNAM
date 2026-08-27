-- GPLX theory question bank + study/mock attempts
CREATE TABLE "GplxTopic" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GplxTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GplxBankQuestion" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "licenseClassesJson" JSONB NOT NULL DEFAULT '[]',
    "imageUrl" TEXT,
    "officialNo" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GplxBankQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GplxBankAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GplxBankAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GplxStudyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unseen',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GplxStudyProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GplxMockAttempt" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseClass" TEXT NOT NULL,
    "questionIdsJson" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "failedCritical" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "detailJson" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "GplxMockAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GplxTopic_appId_code_key" ON "GplxTopic"("appId", "code");
CREATE INDEX "GplxTopic_appId_position_idx" ON "GplxTopic"("appId", "position");
CREATE INDEX "GplxBankQuestion_appId_topicId_idx" ON "GplxBankQuestion"("appId", "topicId");
CREATE INDEX "GplxBankQuestion_appId_isCritical_idx" ON "GplxBankQuestion"("appId", "isCritical");
CREATE INDEX "GplxBankAnswer_questionId_idx" ON "GplxBankAnswer"("questionId");
CREATE UNIQUE INDEX "GplxStudyProgress_userId_questionId_key" ON "GplxStudyProgress"("userId", "questionId");
CREATE INDEX "GplxStudyProgress_userId_status_idx" ON "GplxStudyProgress"("userId", "status");
CREATE INDEX "GplxMockAttempt_appId_userId_startedAt_idx" ON "GplxMockAttempt"("appId", "userId", "startedAt");
CREATE INDEX "GplxMockAttempt_userId_licenseClass_idx" ON "GplxMockAttempt"("userId", "licenseClass");

ALTER TABLE "GplxTopic" ADD CONSTRAINT "GplxTopic_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GplxBankQuestion" ADD CONSTRAINT "GplxBankQuestion_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GplxBankQuestion" ADD CONSTRAINT "GplxBankQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GplxTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GplxBankAnswer" ADD CONSTRAINT "GplxBankAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GplxBankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GplxStudyProgress" ADD CONSTRAINT "GplxStudyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GplxStudyProgress" ADD CONSTRAINT "GplxStudyProgress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GplxBankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GplxMockAttempt" ADD CONSTRAINT "GplxMockAttempt_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GplxMockAttempt" ADD CONSTRAINT "GplxMockAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
