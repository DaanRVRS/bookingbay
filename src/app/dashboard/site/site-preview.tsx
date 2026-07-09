"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Lock,
  Monitor,
  RotateCw,
  Smartphone,
} from "lucide-react";

/**
 * Live voorbeeld van de échte klantsite in een browser-frame — geen mockup
 * maar een iframe van de site zelf, schaalbaar tussen desktop en mobiel.
 * `embedSrc` is het pad-alias (/site/<slug>) zodat de preview same-origin
 * is en ook op dev werkt; `displayUrl` is de echte publieke URL.
 */
export function SitePreview({
  embedSrc,
  displayUrl,
}: {
  embedSrc: string;
  displayUrl: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStage({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Virtuele viewport per apparaat; schaal zodat 'ie in het podium past.
  const virtualW = device === "desktop" ? 1280 : 390;
  const scale =
    device === "desktop"
      ? stage.w > 0
        ? stage.w / virtualW
        : 0
      : stage.h > 0
        ? stage.h / 844
        : 0;
  const virtualH = scale > 0 ? stage.h / scale : 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard geweigerd — knop doet dan gewoon niks zichtbaars */
    }
  };

  const bare = displayUrl.replace(/^https?:\/\//, "");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_-28px_rgba(0,0,0,0.25)]">
      {/* Browser-chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="hidden gap-1.5 sm:flex">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>

        <span className="mx-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">{bare}</span>
          <button
            type="button"
            onClick={copy}
            className="ml-auto shrink-0 rounded p-0.5 transition-colors hover:text-foreground"
            aria-label="URL kopiëren"
            title="URL kopiëren"
          >
            {copied ? (
              <Check className="size-3.5 text-[oklch(0.5_0.14_150)]" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <div className="mr-1 inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`rounded px-2 py-1 transition-colors ${
                device === "desktop"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Desktop-weergave"
              title="Desktop"
            >
              <Monitor className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`rounded px-2 py-1 transition-colors ${
                device === "mobile"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Mobiele weergave"
              title="Mobiel"
            >
              <Smartphone className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voorbeeld verversen"
            title="Verversen"
          >
            <RotateCw className="size-3.5" />
          </button>
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Site openen in nieuw tabblad"
            title="Openen in nieuw tabblad"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Podium met geschaalde live site */}
      <div
        ref={stageRef}
        className={`relative h-[440px] overflow-hidden ${
          device === "mobile" ? "flex justify-center bg-muted/30" : ""
        }`}
      >
        {scale > 0 && (
          <div
            className={device === "mobile" ? "overflow-hidden rounded-b-none border-x border-border shadow-xl" : ""}
            style={{
              width: virtualW * scale,
              height: stage.h,
            }}
          >
            <iframe
              key={`${device}-${reloadKey}`}
              src={embedSrc}
              title="Voorbeeld van je klantsite"
              className="origin-top-left border-0"
              style={{
                width: virtualW,
                height: device === "desktop" ? virtualH : 844,
                transform: `scale(${scale})`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
