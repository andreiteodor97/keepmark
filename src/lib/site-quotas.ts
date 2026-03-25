import { prisma } from "./db";

const FREE_SITE_LIMIT = parseInt(process.env.FREE_SITE_LIMIT || "10", 10);
const ANON_SITE_LIMIT = parseInt(process.env.ANON_SITE_LIMIT || "3", 10);
const FREE_STORAGE_LIMIT = parseInt(
  process.env.FREE_STORAGE_LIMIT || String(100 * 1024 * 1024), // 100 MB
  10,
);

interface QuotaResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether a user (or anonymous visitor) can create a new site.
 */
export async function checkSiteQuota(
  userId: string | null
): Promise<QuotaResult> {
  if (!userId) {
    // Anonymous: basic rate limiting could be added here.
    // For now, allow with a soft limit (enforced elsewhere via TTL).
    return { allowed: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { siteCount: true, storageUsedBytes: true, plan: true },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const siteLimit = user.plan === "free" ? FREE_SITE_LIMIT : Infinity;
  if (user.siteCount >= siteLimit) {
    return {
      allowed: false,
      reason: `Site limit reached (${user.siteCount}/${siteLimit})`,
    };
  }

  const storageLimit = user.plan === "free" ? FREE_STORAGE_LIMIT : Infinity;
  if (Number(user.storageUsedBytes) >= storageLimit) {
    return {
      allowed: false,
      reason: "Storage quota exceeded",
    };
  }

  return { allowed: true };
}

/**
 * Increment user's site count and storage usage after creating a site.
 */
export async function incrementSiteCount(
  userId: string,
  sizeBytes: number
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      siteCount: { increment: 1 },
      storageUsedBytes: { increment: sizeBytes },
    },
  });
}
