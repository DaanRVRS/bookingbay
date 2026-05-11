"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import {
  testDiscordWebhooksAction,
  type DiscordTestResult,
} from "@/lib/discord/test-action";

export function TestDiscordButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    support: DiscordTestResult;
    crm: DiscordTestResult;
  } | null>(null);

  const run = () => {
    startTransition(async () => {
      const res = await testDiscordWebhooksAction();
      setResult(res);
    });
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Test Discord webhooks</p>
          <p className="text-xs text-muted-foreground">
            Stuurt een testbericht naar beide channels. Zien jullie 'm in
            Discord, dan werkt het. Niet? De error verschijnt hieronder.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Test
        </button>
      </div>
      {result && (
        <ul className="mt-3 space-y-2 text-xs">
          <ResultRow label="Support" r={result.support} />
          <ResultRow label="CRM" r={result.crm} />
        </ul>
      )}
    </div>
  );
}

function ResultRow({ label, r }: { label: string; r: DiscordTestResult }) {
  const ok = r.ok;
  return (
    <li
      className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
        ok
          ? "border-[oklch(0.7_0.13_150)]/40 bg-[oklch(0.7_0.13_150)]/5"
          : "border-destructive/40 bg-destructive/5"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[oklch(0.5_0.14_150)]" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {label}{" "}
          <span className="text-muted-foreground">
            ({r.source === "channel-specific"
              ? "channel-specifiek"
              : r.source === "fallback"
                ? "fallback DISCORD_WEBHOOK_URL"
                : "niet geconfigureerd"})
          </span>
        </p>
        {r.urlPreview && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {r.urlPreview}
          </p>
        )}
        {ok ? (
          <p className="text-[oklch(0.45_0.14_150)]">
            ✓ Bericht verstuurd (HTTP {r.status})
          </p>
        ) : (
          <p className="text-destructive">
            {r.status ? `HTTP ${r.status} — ` : ""}
            {r.error ?? "Onbekende fout"}
          </p>
        )}
      </div>
    </li>
  );
}
