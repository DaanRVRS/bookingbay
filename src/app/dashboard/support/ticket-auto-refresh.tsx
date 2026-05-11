"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PollResponse {
  messageCount: number;
  lastMessageAt: string;
  lastStaffReplyAt: string | null;
  lastUserReplyAt: string | null;
  status: string;
}

const POLL_INTERVAL_MS = 5_000;

/**
 * Polls the ticket-poll endpoint every 5s. When a NEW message from the
 * "other" side arrives, play a chime + refresh the page.
 *
 *  - mode="klant"  : klant viewt /dashboard/support/[id] → chime bij
 *                    nieuwe staff-reply (lastStaffReplyAt changed).
 *  - mode="staff"  : admin viewt /admin/support/[id] → chime bij nieuwe
 *                    user-reply (lastUserReplyAt changed).
 */
export function TicketAutoRefresh({
  ticketId,
  initialMessageCount,
  initialLastStaffReplyAt,
  initialLastUserReplyAt,
  mode = "klant",
}: {
  ticketId: string;
  initialMessageCount: number;
  initialLastStaffReplyAt: string | null;
  initialLastUserReplyAt?: string | null;
  mode?: "klant" | "staff";
}) {
  const router = useRouter();
  const lastCountRef = useRef(initialMessageCount);
  const lastStaffAtRef = useRef(initialLastStaffReplyAt);
  const lastUserAtRef = useRef(initialLastUserReplyAt ?? null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/support/tickets/${ticketId}/poll`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data: PollResponse = await res.json();

        const staffReplyChanged =
          data.lastStaffReplyAt &&
          data.lastStaffReplyAt !== lastStaffAtRef.current;
        const userReplyChanged =
          data.lastUserReplyAt &&
          data.lastUserReplyAt !== lastUserAtRef.current;
        const newMessages = data.messageCount > lastCountRef.current;

        lastCountRef.current = data.messageCount;
        lastStaffAtRef.current = data.lastStaffReplyAt;
        lastUserAtRef.current = data.lastUserReplyAt;

        const otherSideReplied =
          (mode === "klant" && staffReplyChanged) ||
          (mode === "staff" && userReplyChanged);

        if (otherSideReplied && newMessages) {
          playChime();
          toast.success(
            mode === "klant"
              ? "Nieuwe reactie van support"
              : "Nieuwe reactie van klant",
          );
          router.refresh();
        } else if (newMessages) {
          router.refresh();
        }
      } catch {
        // Network glitch — silently retry next interval.
      }
    };

    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ticketId, router, mode]);

  return null;
}

/**
 * Two-note chime via Web Audio. Geen extern audio-bestand nodig.
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [
      { f: 880, t: now },
      { f: 1320, t: now + 0.12 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, n.t);
      gain.gain.exponentialRampToValueAtTime(0.25, n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, n.t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(n.t);
      osc.stop(n.t + 0.4);
    }
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // No-op
  }
}
