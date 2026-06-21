"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CATEGORIES,
  INTEGRATIONS,
  priceLabel,
  type IntegrationDef,
} from "@/lib/integrations/catalog";
import type { OrgIntegrationStatus } from "@prisma/client";
import { IntegrationLogo } from "./IntegrationLogo";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";
import { Search } from "lucide-react";

interface Props {
  /** Per-org status per integrationKey — leeg op de publieke pagina. */
  orgStatusByKey?: Record<string, OrgIntegrationStatus>;
  /** Waar elke tegel naartoe linkt. {slug} en {category} worden vervangen. */
  detailHrefTemplate: string;
  /** Default-categorie filter (slug of "all"). */
  initialCategory?: string;
}

export function IntegrationCatalog({
  orgStatusByKey,
  detailHrefTemplate,
  initialCategory = "all",
}: Props) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = INTEGRATIONS.filter((i) => {
      if (category !== "all" && i.categorySlug !== category) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.tagline.toLowerCase().includes(q) ||
        i.categorySlug.includes(q)
      );
    });
    // Sorteer: gekoppeld (geactiveerd) → beschikbaar → binnenkort. Binnen elke
    // groep blijft de catalogus-volgorde behouden (Array.sort is stabiel).
    const rank = (i: IntegrationDef): number => {
      if (orgStatusByKey?.[i.slug] === "ACTIVE") return 0;
      if (i.status === "available" || i.status === "beta") return 1;
      return 2;
    };
    return matched.sort((a, b) => rank(a) - rank(b));
  }, [category, query, orgStatusByKey]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: INTEGRATIONS.length };
    for (const c of CATEGORIES) {
      map[c.slug] = INTEGRATIONS.filter((i) => i.categorySlug === c.slug).length;
    }
    return map;
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Categorie-zijbalk (lijkt op i-reserve's screenshot). */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative mb-3">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek koppeling..."
            className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <nav className="flex flex-col gap-0.5">
          <CategoryButton
            label="Alle koppelingen"
            count={counts["all"]}
            active={category === "all"}
            onClick={() => setCategory("all")}
            icon="🔗"
          />
          {CATEGORIES.map((c) => (
            <CategoryButton
              key={c.slug}
              label={c.name}
              count={counts[c.slug] ?? 0}
              active={category === c.slug}
              onClick={() => setCategory(c.slug)}
              icon={CATEGORY_ICONS[c.slug]}
            />
          ))}
        </nav>
      </aside>

      <div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
            Geen koppelingen gevonden voor &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((i) => (
              <IntegrationCard
                key={i.slug}
                integration={i}
                orgStatus={orgStatusByKey?.[i.slug]}
                href={resolveHref(detailHrefTemplate, i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function resolveHref(template: string, integration: IntegrationDef): string {
  return template
    .replace("{slug}", integration.slug)
    .replace("{category}", integration.categorySlug);
}

const CATEGORY_ICONS: Record<string, string> = {
  agenda: "📅",
  betaalproviders: "€",
  boekhouding: "📊",
  communicatie: "💬",
  "email-marketing": "✉",
  crm: "👥",
  "office-tools": "🗂",
  analytics: "📈",
};

function CategoryButton({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-primary/12 font-medium text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon && (
        <span className="grid size-5 shrink-0 place-items-center text-xs">{icon}</span>
      )}
      <span className="truncate">{label}</span>
      <span
        className={`ml-auto text-[10px] tabular-nums ${
          active ? "text-primary/70" : "text-muted-foreground/70"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function IntegrationCard({
  integration,
  orgStatus,
  href,
}: {
  integration: IntegrationDef;
  orgStatus?: OrgIntegrationStatus;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_32px_-18px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
    >
      <div className="flex items-start justify-between gap-2">
        <IntegrationLogo integration={integration} size="md" />
        <IntegrationStatusBadge
          catalogStatus={integration.status}
          orgStatus={orgStatus}
        />
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-tight">{integration.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {integration.tagline}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-[11px]">
        <span className="font-medium text-foreground tabular-nums">
          {priceLabel(integration.monthlyPriceEuro)}
        </span>
        <span className="text-muted-foreground group-hover:text-primary">
          Details →
        </span>
      </div>
    </Link>
  );
}
