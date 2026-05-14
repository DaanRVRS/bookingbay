"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Plug } from "lucide-react";
import { INTEGRATIONS, CATEGORIES } from "@/lib/integrations/catalog";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";

/**
 * Marketing-strip op de homepage: toont een grid logo-tegels, een korte
 * uitleg + CTA naar de volledige catalogus. Mikt op het idee "kijk, we
 * koppelen met alles wat je al gebruikt".
 */
export function IntegrationsStrip() {
  // Een handig-curated subset zodat 't er niet overvol uitziet; we laten
  // graag de bekende namen zien plus één gratis-tegel per categorie.
  const featured = [
    "google-calendar",
    "outlook-calendar",
    "mollie",
    "stripe",
    "moneybird",
    "exact-online",
    "afas",
    "slack",
    "microsoft-teams",
    "whatsapp-business",
    "mailchimp",
    "hubspot",
    "google-drive",
    "zapier",
    "google-analytics",
  ]
    .map((slug) => INTEGRATIONS.find((i) => i.slug === slug))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <section
      id="koppelingen"
      className="relative border-t border-border bg-muted/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1.4fr]">
          {/* Tekst-kant */}
          <div>
            <p className="text-sm font-medium text-primary">Koppelingen</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Werkt met de tools die je al gebruikt.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Sync met je agenda, laat klanten direct online betalen, push
              facturen naar je boekhouding. Kies de koppelingen die je nodig
              hebt — vaste maandprijs per stuk, opzegbaar wanneer je wil.
            </p>

            <ul className="mt-6 flex flex-col gap-2 text-sm">
              {CATEGORIES.slice(0, 4).map((c) => (
                <li
                  key={c.slug}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                    ✓
                  </span>
                  <span>
                    <strong className="text-foreground">{c.name}</strong> —{" "}
                    {c.blurb}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/koppelingen"
                className="group inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
              >
                Bekijk alle koppelingen
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Plug className="size-3.5" />
                {INTEGRATIONS.length} in catalogus, meer onderweg
              </span>
            </div>
          </div>

          {/* Logo-grid (mimics het screenshot-voorbeeld) */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:gap-3">
            {featured.map((i, idx) => (
              <motion.div
                key={i.slug}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: idx * 0.03, duration: 0.35, ease: "easeOut" }}
              >
                <Link
                  href={`/koppelingen/${i.categorySlug}/${i.slug}`}
                  className="group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_20px_-12px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
                >
                  <IntegrationLogo integration={i} size="sm" />
                  <span className="text-center text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
                    {i.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
