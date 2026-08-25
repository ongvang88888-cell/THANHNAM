/**
 * Background workers (BullMQ).
 * MVP: entitlement expiry + webhook retry stubs.
 * Production: separate process with concurrency limits.
 */
import { Queue, Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export const entitlementQueue = new Queue("entitlement-jobs", { connection });
export const webhookQueue = new Queue("webhook-jobs", { connection });

new Worker(
  "entitlement-jobs",
  async (job) => {
    console.log("[worker] entitlement job", job.name, job.data);
    // Expire entitlements, refresh caches — implement against Prisma in production.
  },
  { connection }
);

new Worker(
  "webhook-jobs",
  async (job) => {
    console.log("[worker] webhook retry", job.name, job.data);
  },
  { connection }
);

console.log("Workers listening (entitlement-jobs, webhook-jobs)");
