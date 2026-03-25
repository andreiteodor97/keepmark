import { prisma } from "./db";
import { getMonthKey } from "./utils";

export interface SyncResult {
  received: number;
  accepted: number;
  upserted: number;
  added: number;
  skipped: number;
  limitReached: boolean;
  linkLimit: number;
  linkCount: number;
  linkCountLifetime: number;
  linkCountMonth: number;
  linkCountMonthKey: string;
}

export interface QuotaCheck {
  allowed: boolean;
  plan: string;
  limitScope: "lifetime" | "month";
  linkLimit: number;
  linkCount: number;
}

/**
 * Check whether a user can save more links based on their plan.
 *
 * - Free plan: linkCountLifetime < linkLimit (default 50)
 * - Plus plan: linkCountMonth < linkLimit (default 500), resets monthly
 */
export async function checkQuota(userId: string): Promise<QuotaCheck> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const currentMonthKey = getMonthKey();

  if (user.plan === "free") {
    return {
      allowed: user.linkCountLifetime < user.linkLimit,
      plan: user.plan,
      limitScope: "lifetime",
      linkLimit: user.linkLimit,
      linkCount: user.linkCountLifetime,
    };
  }

  // Plus (or any paid plan): monthly limit with auto-reset
  // If the stored monthKey doesn't match current month, the count effectively resets
  const isCurrentMonth = user.linkCountMonthKey === currentMonthKey;
  const effectiveMonthCount = isCurrentMonth ? user.linkCountMonth : 0;

  // If month rolled over, reset the count in DB
  if (!isCurrentMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkCountMonth: 0,
        linkCountMonthKey: currentMonthKey,
      },
    });
  }

  return {
    allowed: effectiveMonthCount < user.linkLimit,
    plan: user.plan,
    limitScope: "month",
    linkLimit: user.linkLimit,
    linkCount: effectiveMonthCount,
  };
}

/**
 * Increment the link count for a user.
 * Bumps both linkCountLifetime and linkCountMonth.
 * Resets linkCountMonth if the monthKey has rolled over.
 */
export async function incrementLinkCount(userId: string): Promise<void> {
  const currentMonthKey = getMonthKey();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { linkCountMonthKey: true },
  });

  const isCurrentMonth = user.linkCountMonthKey === currentMonthKey;

  if (isCurrentMonth) {
    // Same month — increment both counters
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkCountLifetime: { increment: 1 },
        linkCountMonth: { increment: 1 },
      },
    });
  } else {
    // New month — reset monthly counter to 1, increment lifetime
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkCountLifetime: { increment: 1 },
        linkCountMonth: 1,
        linkCountMonthKey: currentMonthKey,
      },
    });
  }
}
