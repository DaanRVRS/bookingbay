import "server-only";
import { db } from "@/lib/db";

export async function listPollsForAdmin() {
  const polls = await db.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { votes: true } },
    },
    take: 200,
  });
  return polls;
}

export async function listPublishedPollsForUser(userId: string) {
  const polls = await db.poll.findMany({
    where: { status: { in: ["open", "closed"] } },
    orderBy: { publishedAt: "desc" },
    include: {
      _count: { select: { votes: true } },
      votes: { where: { userId }, select: { optionIndices: true } },
    },
    take: 50,
  });
  return polls;
}

export async function getPollForAdmin(id: string) {
  return db.poll.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      votes: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getPollForUser(pollId: string, userId: string) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: {
      _count: { select: { votes: true } },
      votes: {
        where: { userId },
        select: { optionIndices: true },
      },
    },
  });
  if (!poll) return null;
  // Don't expose draft polls to users.
  if (poll.status === "draft") return null;
  return poll;
}

/**
 * Tallies votes per option index. Returns array of counts where index N is
 * the count for option N. Works for both single- and multi-choice polls.
 */
export function tallyVotes(
  options: string[],
  votes: Array<{ optionIndices: unknown }>,
): number[] {
  const counts = new Array(options.length).fill(0) as number[];
  for (const v of votes) {
    if (!Array.isArray(v.optionIndices)) continue;
    for (const idx of v.optionIndices) {
      if (typeof idx === "number" && idx >= 0 && idx < counts.length) {
        counts[idx] += 1;
      }
    }
  }
  return counts;
}

export function safeOptions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((s): s is string => typeof s === "string" && s.length > 0);
}
