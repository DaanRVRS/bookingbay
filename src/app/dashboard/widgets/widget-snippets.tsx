"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function CopyBlock({
  label,
  value,
  language,
}: {
  label: string;
  value: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        toast.success("Gekopieerd");
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error("Kopiëren mislukt"),
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border bg-background/50 px-3 py-2">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {language ?? label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-[oklch(0.5_0.14_150)]" />
              Gekopieerd
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Kopieer
            </>
          )}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-3 text-[11px] leading-relaxed text-foreground/90">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export function LinkBlock({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        toast.success("Link gekopieerd");
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error("Kopiëren mislukt"),
    );
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium hover:bg-accent"
      >
        <ExternalLink className="size-3" />
        Open
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium hover:bg-accent"
      >
        {copied ? (
          <>
            <Check className="size-3 text-[oklch(0.5_0.14_150)]" />
            OK
          </>
        ) : (
          <>
            <Copy className="size-3" />
            Kopieer
          </>
        )}
      </button>
    </div>
  );
}
