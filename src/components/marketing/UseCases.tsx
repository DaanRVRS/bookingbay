"use client";

import { motion } from "motion/react";
import {
  Sailboat,
  Waves,
  Bike,
  Tent,
  PartyPopper,
  TreePalm,
  type LucideIcon,
} from "lucide-react";

const cases: { icon: LucideIcon; title: string; body: string; tag: string }[] = [
  {
    icon: Sailboat,
    title: "Boten & sloepen",
    body: "Per uur, dagdeel of dag. Borg, schipper en brandstof — automatisch in de prijs.",
    tag: "Watersport",
  },
  {
    icon: Waves,
    title: "Sup, kano & kajak",
    body: "Tijdsloten per board, voorraad per maat en weersafhankelijk annuleren.",
    tag: "Peddelsport",
  },
  {
    icon: Bike,
    title: "Fietsen & e-bikes",
    body: "Snelle uitgifte aan de balie, online reserveren en accu-status per fiets.",
    tag: "Recreatie",
  },
  {
    icon: Tent,
    title: "Outdoor & camping",
    body: "Tenten, trekkershutten en survival-gear — bundels, borg en terugbrengcheck.",
    tag: "Outdoor",
  },
  {
    icon: PartyPopper,
    title: "Party & event",
    body: "Springkussens, statafels, tappunten. Bezorging, opbouw en pakbon in één klik.",
    tag: "Events",
  },
  {
    icon: TreePalm,
    title: "Strand & beleving",
    body: "Strandhuisjes, dagje-uit-arrangementen en losse spullen — alles op je eigen agenda.",
    tag: "Vakantie",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="relative border-t border-border bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Gemaakt voor de vrijetijdsbranche</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Gebouwd voor watersport & recreatie.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Van sloepen en sups tot e-bikes en kampeerspullen — jij bepaalt je
            categorieën en tarieven. Per uur, dagdeel of week, met borg,
            seizoensprijzen en weersafhankelijk annuleren.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_18px_48px_-24px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110 group-hover:rotate-[-4deg]">
                  <c.icon className="size-5" />
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {c.tag}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
