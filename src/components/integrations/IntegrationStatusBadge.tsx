import type { IntegrationStatus } from "@/lib/integrations/catalog";
import type { OrgIntegrationStatus } from "@prisma/client";

const CATALOG: Record<
  IntegrationStatus,
  { label: string; className: string }
> = {
  available: {
    label: "Beschikbaar",
    className:
      "bg-[oklch(0.95_0.04_150)] text-[oklch(0.45_0.14_150)] dark:bg-[oklch(0.3_0.06_150)] dark:text-[oklch(0.8_0.1_150)]",
  },
  beta: {
    label: "Beta",
    className:
      "bg-[oklch(0.94_0.06_70)] text-[oklch(0.5_0.16_70)] dark:bg-[oklch(0.3_0.08_70)] dark:text-[oklch(0.8_0.12_70)]",
  },
  "coming-soon": {
    label: "Binnenkort",
    className: "bg-muted text-muted-foreground",
  },
};

const ORG: Record<OrgIntegrationStatus, { label: string; className: string }> = {
  INTERESTED: {
    label: "Interesse getoond",
    className: "bg-primary/12 text-primary",
  },
  REQUESTED: {
    label: "Aangevraagd",
    className: "bg-primary/15 text-primary",
  },
  ACTIVE: {
    label: "Actief",
    className:
      "bg-[oklch(0.93_0.07_150)] text-[oklch(0.4_0.14_150)] dark:bg-[oklch(0.28_0.08_150)] dark:text-[oklch(0.82_0.1_150)]",
  },
  PAUSED: {
    label: "Gepauzeerd",
    className: "bg-muted text-muted-foreground",
  },
  FAILED: {
    label: "Verbinding verbroken",
    className:
      "bg-[oklch(0.94_0.08_25)] text-[oklch(0.5_0.18_25)] dark:bg-[oklch(0.3_0.1_25)] dark:text-[oklch(0.8_0.13_25)]",
  },
};

/**
 * Toont één badge — als er een org-state is gebruiken we die (Actief /
 * Aangevraagd / …), anders de catalogus-status (Beschikbaar / Binnenkort).
 */
export function IntegrationStatusBadge({
  catalogStatus,
  orgStatus,
  size = "md",
}: {
  catalogStatus: IntegrationStatus;
  orgStatus?: OrgIntegrationStatus | null;
  size?: "sm" | "md";
}) {
  const meta = orgStatus ? ORG[orgStatus] : CATALOG[catalogStatus];
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding} ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
