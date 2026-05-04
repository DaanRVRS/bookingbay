"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

const items = [
  {
    q: "Voor welke verhuurbedrijven is BookingBay geschikt?",
    a: "Iedereen die spullen, voertuigen of ervaringen verhuurt — boten, fietsen, auto's, gereedschap, party-spullen, golfkarretjes. Je definieert je eigen categorieën, dus er is geen 'verkeerde' branche.",
  },
  {
    q: "Kan ik mijn huidige Excel-bestand importeren?",
    a: "We helpen graag bij de eerste import. Stuur je bestand op en we converteren het naar BookingBay-categorieën en items.",
  },
  {
    q: "Hoe werkt de eigen klantsite?",
    a: "Elke organisatie krijgt automatisch een sub-domein op bookingbay.nl. Op een betaald plan kan je je eigen domein koppelen. Je past kleur, logo en teksten aan in de dashboard-customizer.",
  },
  {
    q: "Kunnen klanten direct online betalen?",
    a: "In de huidige versie sturen klanten een aanvraag via je site. Online betaalde reserveringen staan op de roadmap.",
  },
  {
    q: "Wat als ik wil stoppen?",
    a: "Geen contracten, geen opzegtermijn. Je exporteert je data in CSV/JSON-formaat en je account is per direct stopgezet.",
  },
  {
    q: "Hoe zit het met de AVG?",
    a: "Hosting in Europa (Hetzner, Duitsland), dagelijkse encrypted back-ups, en een verwerkersovereenkomst die je in je dashboard kan downloaden.",
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
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-medium">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground"
        >
          <Plus className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
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
