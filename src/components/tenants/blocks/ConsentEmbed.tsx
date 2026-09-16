"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

/**
 * Klik-om-te-laden voor iframes van derden (YouTube, Vimeo, Google Maps)
 * op klantsites. Tot de bezoeker klikt wordt er geen verbinding met de
 * aanbieder gemaakt (geen IP-adres, geen cookies) — vereist door de
 * Telecommunicatiewet art. 11.7a / BE art. 129 WEC. De verhuurder hoeft
 * daardoor geen cookiebanner op zijn site te zetten voor deze blokken.
 */
export function ConsentEmbed({
  src,
  title,
  provider,
  className,
  iframeClassName,
  allow,
  allowFullScreen,
  referrerPolicy,
  loadLabel,
  placeholder,
  externalHref,
  externalLabel,
}: {
  src: string;
  title: string;
  provider: "YouTube" | "Vimeo" | "Google Maps";
  className: string;
  iframeClassName: string;
  allow?: string;
  allowFullScreen?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  loadLabel: string;
  /** Tekst in de placeholder (bv. het adres bij een kaart). */
  placeholder?: string;
  /** Alternatief zonder embed, bv. "Open in Google Maps". */
  externalHref?: string | null;
  externalLabel?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const party =
    provider === "Vimeo" ? "Vimeo" : "Google";

  return (
    <div className={className}>
      {loaded ? (
        <iframe
          src={src}
          title={title}
          className={iframeClassName}
          allow={allow}
          allowFullScreen={allowFullScreen}
          referrerPolicy={referrerPolicy}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {placeholder && (
            <p className="max-w-md text-sm font-medium whitespace-pre-line text-foreground">
              {placeholder}
            </p>
          )}
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
            style={{
              background: "var(--tenant-accent, #1a2238)",
              color: "var(--tenant-on-accent, #fff)",
            }}
          >
            {loadLabel}
          </button>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Bij het laden ontvangt {party} ({provider}) je IP-adres en kan het
            cookies plaatsen. Tot je klikt gaat er niets naar {party}.
          </p>
          {externalHref && externalLabel && (
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {externalLabel}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
