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

const POLL_INTERVAL_MS = 12_000;

/**
 * Polls the ticket-poll endpoint every 12s. When the server reports a new
 * staff reply (lastStaffReplyAt verandert), play a chime + refresh de pagina
 * zodat de nieuwe message in beeld komt. Geen sound bij eigen reply.
 */
export function TicketAutoRefresh({
  ticketId,
  initialMessageCount,
  initialLastStaffReplyAt,
}: {
  ticketId: string;
  initialMessageCount: number;
  initialLastStaffReplyAt: string | null;
}) {
  const router = useRouter();
  const lastCountRef = useRef(initialMessageCount);
  const lastStaffAtRef = useRef(initialLastStaffReplyAt);

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
        const newMessages = data.messageCount > lastCountRef.current;

        lastCountRef.current = data.messageCount;
        lastStaffAtRef.current = data.lastStaffReplyAt;

        if (staffReplyChanged && newMessages) {
          playChime();
          toast.success("Nieuwe reactie van support");
          router.refresh();
        } else if (newMessages) {
          // Other side of the conversation updated (probably our own send
          // landed) — just refresh, no sound.
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
  }, [ticketId, router]);

  return null;
}

/**
 * Two-note chime via Web Audio. Geen extern audio-bestand nodig.
 * Falt silently terug op niets als de browser audio blokkeert.
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
    // Close context after the sound finishes so we don't leak audio nodes.
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // No-op
  }
}
