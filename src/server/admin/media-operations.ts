import { count } from "drizzle-orm";
import { getDb } from "../../db";
import { mediaCleanupJobs, mediaIngests, mediaProcessingJobs } from "../../db/schema";

const ingestStatuses = ["reserved", "uploading", "quarantined", "ready", "rejected"] as const;
const processingStatuses = ["queued", "leased", "done", "dead"] as const;
const cleanupStatuses = ["pending", "leased", "done", "dead"] as const;

function byStatus<T extends string>(
  expected: readonly T[],
  rows: readonly { status: T; total: number }[],
): Record<T, number> {
  return Object.fromEntries(expected.map((status) => [
    status, rows.find((row) => row.status === status)?.total ?? 0,
  ])) as Record<T, number>;
}

/** Counts only. Never return upload IDs, titles, hashes, or provider errors. */
export async function getAdminMediaOperationsOverview() {
  const db = getDb();
  const [ingests, processing, cleanup] = await Promise.all([
    db.select({ status: mediaIngests.status, total: count() })
      .from(mediaIngests).groupBy(mediaIngests.status),
    db.select({ status: mediaProcessingJobs.status, total: count() })
      .from(mediaProcessingJobs).groupBy(mediaProcessingJobs.status),
    db.select({ status: mediaCleanupJobs.status, total: count() })
      .from(mediaCleanupJobs).groupBy(mediaCleanupJobs.status),
  ]);
  return {
    ingests: byStatus(ingestStatuses, ingests),
    processing: byStatus(processingStatuses, processing),
    cleanup: byStatus(cleanupStatuses, cleanup),
  };
}
