"use client";

import { useId, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { RETENTION } from "@/lib/company";

const items = [
  {
    q: "Voor welke verhuurbedrijven is BookingBay geschikt?",
    a: "BookingBay is gebouwd voor de vrijetijdsbranche: botenverhuur, sup & kano, e-bikes, camping-, outdoor- en party-verhuur. Je definieert je eigen categorieën en tarieven, dus elke recreatie-niche past — van sloepenverhuur tot strandhuisjes.",
  },
  {
    q: "Kan ik mijn huidige Excel-bestand importeren?",
    a: "We helpen graag bij de eerste import. Stuur je bestand op en we converteren het naar BookingBay-categorieën en items.",
  },
  {
    q: "Hoe werkt de eigen klantsite?",
    a: "Elke organisatie krijgt automatisch een sub-domein op bookingbay.nl. Op Professional en Business kan je je eigen domein koppelen. Je past kleur, logo en teksten aan in de dashboard-customizer.",
  },
  {
    q: "Ik heb al een eigen website. Kan ik BookingBay daar inbouwen?",
    a: "Ja. Bij elk plan (ook Starter) zit een boekings-widget die je op je bestaande site kan plaatsen — een klein stukje code dat je in elke website-bouwer kan plakken. Geen technische kennis? Wij installeren 'm gratis voor je. Plan even een hulpgesprek via /contact.",
  },
  {
    q: "Kunnen klanten direct online betalen?",
    a: "Ja. Koppel je eigen Mollie- of Stripe-account in Instellingen → Betalen; klanten rekenen dan bij het boeken direct af (Mollie: o.a. iDEAL) en het geld komt rechtstreeks bij jou binnen. Je kunt ook (of alleen) betalen op locatie aanbieden.",
  },
  {
    q: "Wat als ik wil stoppen?",
    a: `Geen jaarcontract. Je zegt op in het dashboard; het abonnement stopt aan het einde van de lopende betaalde maand en tot die tijd blijft alles werken. Daarna blijven je gegevens ${RETENTION.orgDeleteMonths} maanden beschikbaar om te hervatten of als CSV te exporteren; dan verwijderen we de organisatie automatisch (${RETENTION.orgDeleteWarnDays} dagen vooraf krijg je een mail). Facturen bewaren we ${RETENTION.financeYears} jaar. Eerder verwijderen kan zelf in het dashboard.`,
  },
  {
    q: "Hoe zit het met de AVG?",
    a: "Hosting in Europa (Hetzner, Duitsland), dagelijkse back-ups, en een verwerkersovereenkomst die onderdeel is van onze voorwaarden — je vindt 'm op bookingbay.nl/verwerkersovereenkomst.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-medium text-primary">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Vragen die we vaak krijgen.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  return (
    <div>
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        >
          <span className="text-base font-medium">{q}</span>
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground"
          >
            <Plus className="size-4" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
