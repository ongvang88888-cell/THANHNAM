/**
 * Background workers (BullMQ) — entitlement expiry + webhook retry.
 */
import { Queue, Worker } from "bullmq";
import { PrismaClient } from "@edu/database";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const prisma = new PrismaClient();

export const entitlementQueue = new Queue("entitlement-jobs", { connection });
export const webhookQueue = new Queue("webhook-jobs", { connection });
export const mediaQueue = new Queue("media-jobs", { connection });

async function expireEntitlements() {
  const now = new Date();
  const result = await prisma.entitlement.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  console.log(`[worker] expired entitlements: ${result.count}`);
  return result.count;
}

new Worker(
  "entitlement-jobs",
  async (job) => {
    if (job.name === "expire") {
      return expireEntitlements();
    }
    console.log("[worker] entitlement job", job.name, job.data);
  },
  { connection },
);

new Worker(
  "webhook-jobs",
  async (job) => {
    console.log("[worker] webhook retry", job.name, job.data);
    // Production: re-POST to /payments/webhooks/:provider with stored payload
  },
  { connection },
);

new Worker(
  "media-jobs",
  async (job) => {
    console.log("[worker] media job", job.name, job.data);
    if (job.name === "mark-ready" && job.data?.videoId) {
      await prisma.video.update({
        where: { id: job.data.videoId },
        data: { status: "READY" },
      });
    }
  },
  { connection },
);

// Schedule periodic expiry every 5 minutes
async function bootstrap() {
  await entitlementQueue.add(
    "expire",
    {},
    { repeat: { every: 5 * 60_000 }, removeOnComplete: 20, removeOnFail: 50 },
  );
  // Run once at boot
  await expireEntitlements();
  console.log("Workers listening (entitlement-jobs, webhook-jobs, media-jobs)");
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
