import type { IntegrationDef } from "@/lib/integrations/catalog";

/**
 * "App-icon" stijl tegel-logo voor de catalogus. Voor elke koppeling
 * tonen we een vierkante tegel in de brand-kleur met een geometrisch
 * mark in het wit. We gebruiken geen letterlijke vendor-SVG's (zou
 * trademark-issues geven) maar wel direct herkenbare vormen + de naam
 * van de provider eronder.
 *
 * Maten:
 *   sm  → 28×28 px tegel + tekst onder (used in lijsten + sidebar)
 *   md  → 40×40 px tegel + tekst onder (catalogus-grid)
 *   lg  → 56×56 px tegel + grote tekst (detail-pagina hero)
 */
export function IntegrationLogo({
  integration,
  size = "md",
  hideLabel = true,
}: {
  integration: IntegrationDef;
  size?: "sm" | "md" | "lg";
  hideLabel?: boolean;
}) {
  const color = integration.brandColor ?? "var(--primary)";

  const tileSize = size === "lg" ? "size-14" : size === "sm" ? "size-7" : "size-10";
  const radius = size === "lg" ? "rounded-2xl" : size === "sm" ? "rounded-md" : "rounded-xl";
  const labelClass =
    size === "lg"
      ? "mt-2 text-sm font-semibold"
      : size === "sm"
        ? "mt-1 text-[9px] font-medium"
        : "mt-1.5 text-[11px] font-medium";

  return (
    <div className="flex flex-col items-start">
      <div
        className={`${tileSize} ${radius} relative grid place-items-center overflow-hidden shadow-[0_2px_8px_-4px_rgba(0,0,0,0.15)]`}
        style={{ backgroundColor: color }}
      >
        <LogoMark integration={integration} size={size} />
      </div>
      {!hideLabel && integration.logoText && (
        <p
          className={`${labelClass} max-w-[5.5rem] truncate text-foreground/80`}
        >
          {integration.logoText}
        </p>
      )}
    </div>
  );
}

/**
 * Inline SVG-mark per koppeling. Eenvoudige, geabstraheerde shapes —
 * doel is herkenbaarheid zonder vendor-logo's te kopiëren. Fallback =
 * eerste letter van de provider in wit.
 */
function LogoMark({
  integration,
  size,
}: {
  integration: IntegrationDef;
  size: "sm" | "md" | "lg";
}) {
  const iconSize =
    size === "lg" ? "size-7" : size === "sm" ? "size-3.5" : "size-5";

  switch (integration.slug) {
    case "google-calendar":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="white" strokeWidth="2" />
          <path d="M3 9h18" stroke="white" strokeWidth="2" />
          <path d="M8 3v4M16 3v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="15" r="1.5" fill="white" />
        </svg>
      );
    case "outlook-calendar":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="white" strokeWidth="2" />
          <path d="M3 9h18" stroke="white" strokeWidth="2" />
          <circle cx="8" cy="14" r="1.5" fill="white" />
          <circle cx="12" cy="14" r="1.5" fill="white" />
          <circle cx="16" cy="14" r="1.5" fill="white" />
        </svg>
      );
    case "apple-calendar":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <rect x="3" y="5" width="18" height="16" rx="3" fill="white" />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="#000"
          >
            14
          </text>
        </svg>
      );
    case "mollie":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <circle cx="9" cy="12" r="3.5" fill="white" />
          <circle cx="15" cy="12" r="3.5" fill="white" />
        </svg>
      );
    case "stripe":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <path
            d="M7 9c0-1.1 1-2 2.5-2 1.5 0 3 .5 4.5 1.5L15 6c-1.5-1-3.5-1.5-5.5-1.5-3 0-5 1.5-5 4 0 4.5 7 3 7 5.5 0 1-1 1.5-2.5 1.5-2 0-4-.7-5.5-1.7v3c1.5.8 3.5 1.2 5.5 1.2 3 0 5.5-1.3 5.5-4 0-5-7-3.5-7-5.5z"
            fill="white"
          />
        </svg>
      );
    case "buckaroo":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            B
          </text>
        </svg>
      );
    case "paypal":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <path
            d="M7 4h6.5c2.8 0 4.5 1.5 4 4-.5 2.5-2.5 4-5.5 4H9l-.8 4.5L8 20H5l2-16z"
            fill="white"
          />
          <path
            d="M10 9h4.5c1.5 0 2.2.7 2 2-.3 1.5-1.5 2.5-3.5 2.5H10.7L10 9z"
            fill={"color-mix(in oklch, white 50%, transparent)"}
          />
        </svg>
      );
    case "moneybird":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <path
            d="M4 14c0-3 3-6 7-6s7 3 7 6c0 2-1 3.5-3 4l-2-3-2 2-2-2-2 2-3-3z"
            fill="white"
          />
          <circle cx="14" cy="11" r="1" fill={"color-mix(in oklch, white 30%, transparent)"} />
        </svg>
      );
    case "exact-online":
    case "exact":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fill="white"
          >
            =
          </text>
        </svg>
      );
    case "afas":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <path
            d="M4 18l5-12h2l-2 5h3l-1 3h-3l-2 4H4zM14 18l5-12h2l-2 5h3l-1 3h-3l-2 4h-2z"
            fill="white"
          />
        </svg>
      );
    case "e-boekhouden":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            e
          </text>
        </svg>
      );
    case "twinfield":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <rect x="5" y="6" width="14" height="12" rx="1.5" stroke="white" strokeWidth="2" />
          <path d="M9 10h6M9 13h6M9 16h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "slack":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <rect x="4" y="10" width="8" height="3" rx="1.5" fill="white" />
          <rect x="12" y="4" width="3" height="8" rx="1.5" fill="white" />
          <rect x="12" y="11" width="8" height="3" rx="1.5" fill="white" transform="rotate(180 16 12.5)" />
          <rect x="9" y="12" width="3" height="8" rx="1.5" fill="white" transform="rotate(180 10.5 16)" />
        </svg>
      );
    case "microsoft-teams":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <rect x="3" y="7" width="11" height="10" rx="1.5" fill="white" />
          <circle cx="17" cy="9" r="2.5" fill="white" />
          <text
            x="8.5"
            y="14.5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill={"color-mix(in oklch, white 0%, var(--primary, currentColor) 100%)"}
            style={{ fill: "#4a4ab3" }}
          >
            T
          </text>
        </svg>
      );
    case "whatsapp-business":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M12 4a8 8 0 00-7 11.8L4 20l4.3-1A8 8 0 1012 4zm4.4 11.3c-.2.5-1.1 1-1.5 1-.4 0-.9.2-3-1-2.5-1.4-4-3.9-4.2-4-.1-.2-1-1.3-1-2.4 0-1.2.6-1.7.8-2 .2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.7c0 .2 0 .3-.1.4l-.3.4-.2.3c-.1.1-.2.2 0 .4l.7 1.2c.5.8 1 1.3 1.7 1.7.2.1.3.1.4 0l.6-.8c.1-.2.3-.1.4-.1.2 0 1.6.8 1.8.9.2.1.4.2.4.3.1.2.1.5 0 .9z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M18 5a14 14 0 00-3.5-1l-.2.4a13 13 0 014.7 2.2A10 10 0 005 6.6a13 13 0 014.7-2.2L9.5 4A14 14 0 006 5C3 9.5 2 14 2 18.5c1.7 1.3 3.4 2 5 2.5l1-1.5a8 8 0 01-2-.9l.4-.3a10 10 0 0011 0l.4.3c-.6.4-1.3.7-2 .9l1 1.5c1.7-.5 3.4-1.2 5-2.5C22 14 21 9.5 18 5zM9 15c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.8 1 1.8 2-.8 2-1.8 2zm6 0c-1 0-1.8-1-1.8-2s.8-2 1.8-2 1.8 1 1.8 2-.8 2-1.8 2z" />
        </svg>
      );
    case "mailchimp":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M19 9c-.5-.4-1.2-.6-1.8-.5C16.5 6 14.5 4 12 4S7.5 6 6.8 8.5C5 9 4 10.6 4 12.5 4 15 6 17 8.5 17H11l1 3 3-2.5h.5c2.5 0 4.5-2 4.5-4.5 0-1.7-.7-3.2-2-4z" />
          <circle cx="11" cy="11" r="1.5" fill="currentColor" />
        </svg>
      );
    case "brevo":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M4 6l8 6 8-6v2l-8 6-8-6V6zm0 4l8 6 8-6v8H4v-8z" />
        </svg>
      );
    case "activecampaign":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M5 5l14 7-14 7V5zm0 8.5l7 1.5-7 1.5v-3z" />
        </svg>
      );
    case "hubspot":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <circle cx="14" cy="12" r="4" stroke="white" strokeWidth="2" />
          <path d="M14 8V4M5 5l5 5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="5" cy="5" r="1.5" fill="white" />
          <circle cx="14" cy="4" r="1.5" fill="white" />
        </svg>
      );
    case "pipedrive":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M10 4h4a5 5 0 010 10h-2v6H8V4h2zm2 3v4h2a2 2 0 000-4h-2z" />
        </svg>
      );
    case "google-drive":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M9 4h6l6 10-3 6h-6l-3-6 3-10H9z" opacity=".8" />
          <path d="M3 14l6-10h3l-6 10H3z" />
          <path d="M9 14h12l-3 6H6l3-6z" opacity=".6" />
        </svg>
      );
    case "dropbox":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <path d="M7 4l5 3-5 3-5-3 5-3zm10 0l5 3-5 3-5-3 5-3zM2 12l5 3 5-3-5-3-5 3zm10 0l5 3 5-3-5-3-5 3zm-2 5l5 3 5-3-5-3-5 3z" />
        </svg>
      );
    case "zapier":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l3 3M15.5 15.5l3 3M18.5 5.5l-3 3M8.5 15.5l-3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "google-analytics":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="white">
          <rect x="4" y="14" width="3" height="6" rx="1" />
          <rect x="10" y="9" width="3" height="11" rx="1" />
          <rect x="16" y="4" width="3" height="16" rx="1" />
        </svg>
      );
    case "plausible":
      return (
        <svg viewBox="0 0 24 24" className={iconSize} fill="none">
          <path d="M4 16l5-6 4 4 7-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="13" cy="14" r="1.5" fill="white" />
        </svg>
      );
    default: {
      // Fallback — eerste letter van de naam in wit.
      const initial = integration.name.trim().charAt(0).toUpperCase();
      return (
        <svg viewBox="0 0 24 24" className={iconSize}>
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fill="white"
          >
            {initial}
          </text>
        </svg>
      );
    }
  }
}
