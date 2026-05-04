"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  slug: string;
  baseUrl: string;
}

export function EmbedSnippet({ slug, baseUrl }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const snippet = `<div data-bookingbay="${slug}"></div>
<script src="${baseUrl}/embed.js" defer></script>`.trim();

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(key);
        toast.success("Code gekopieerd");
        setTimeout(() => setCopied(null), 1500);
      },
      () => toast.error("Kopiëren mislukt"),
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold">Embed op je eigen website</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Plak deze code op je bestaande site om je BookingBay-aanbod direct te tonen. De widget
        gebruikt automatisch je logo en accentkleur.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted/40">
        <div className="flex items-center justify-between border-b border-border bg-background/50 px-3 py-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            HTML
          </span>
          <button
            type="button"
            onClick={() => copy(snippet, "snippet")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
          >
            {copied === "snippet" ? (
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
          <code>{snippet}</code>
        </pre>
      </div>

      <details className="mt-4 rounded-md text-xs">
        <summary className="cursor-pointer px-1 py-1 font-medium text-muted-foreground hover:text-foreground">
          Hoe gebruik ik dit?
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Kopieer de HTML hierboven.</li>
          <li>
            Plak 'm op de pagina van je eigen website waar je het aanbod wilt tonen — bijvoorbeeld
            in WordPress, Wix, Squarespace, of een eigen site.
          </li>
          <li>
            De widget past zich automatisch aan: hij groeit mee met de inhoud, gebruikt jouw
            logo + accentkleur, en stuurt aanvragen direct naar je leads-inbox.
          </li>
        </ol>
      </details>
    </div>
  );
}
