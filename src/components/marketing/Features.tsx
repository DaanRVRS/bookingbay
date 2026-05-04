"use client";

import { motion } from "motion/react";
import {
  CalendarRange,
  Globe,
  ShieldCheck,
  Users,
  Zap,
  Layers,
} from "lucide-react";

export function Features() {
  return (
    <section id="features" className="relative border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Functies</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Alles erin. Niets te veel.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            We hebben de helft van de features eruit gelaten waar je nooit op zou klikken — zodat
            wat je wél nodig hebt razendsnel werkt.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-6">
          <FeatureCard
            className="sm:col-span-3 lg:col-span-3"
            icon={CalendarRange}
            title="Slimme planning"
            body="Kalender per item met automatische conflict-detectie. Drag-and-drop boekingen, dubbelboekingen kunnen niet meer."
            visual={<CalendarVisual />}
            delay={0}
          />
          <FeatureCard
            className="sm:col-span-3 lg:col-span-3"
            icon={Globe}
            title="Eigen klantsite"
            body="Elke organisatie krijgt een eigen URL met logo, kleuren en items. Klanten zien wat beschikbaar is en sturen leads direct binnen."
            visual={<SiteVisual />}
            delay={0.05}
          />
          <FeatureCard
            className="sm:col-span-2"
            icon={Layers}
            title="Universele catalogus"
            body="Zelf categorieën nesten, prijzen per uur/dag/week, eigen velden waar je ze nodig hebt."
            delay={0.1}
          />
          <FeatureCard
            className="sm:col-span-2"
            icon={Users}
            title="Team & rollen"
            body="OWNER, ADMIN, MANAGER, VIEWER. Iedereen ziet alleen wat hij mag zien."
            delay={0.15}
          />
          <FeatureCard
            className="sm:col-span-2"
            icon={Zap}
            title="Snel als de wind"
            body="Server-rendered, mobile-first. Boekingen aanmaken duurt seconden, niet minuten."
            delay={0.2}
          />
          <FeatureCard
            className="sm:col-span-3"
            icon={ShieldCheck}
            title="Privacy by default"
            body="Hosting in Europa, dagelijkse back-ups, AVG-proof. Jouw data is van jou — punt."
            delay={0.25}
          />
          <FeatureCard
            className="sm:col-span-3"
            icon={Globe}
            title="Custom domain"
            body="Koppel je eigen domein aan je BookingBay-site. Wij regelen het SSL-certificaat."
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  className,
  visual,
  delay = 0,
}: {
  icon: typeof CalendarRange;
  title: string;
  body: string;
  className?: string;
  visual?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-card/80 ${className ?? ""}`}
    >
      {visual && <div className="mb-6">{visual}</div>}
      <span className="inline-grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </motion.div>
  );
}

function CalendarVisual() {
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-border bg-background/60 p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }).map((_, i) => {
          const filled = [3, 4, 5, 8, 11, 12, 18, 19, 20, 24, 25].includes(i);
          const second = [9, 13, 17, 22].includes(i);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.015, duration: 0.3 }}
              className={
                filled
                  ? "h-4 rounded bg-primary/80"
                  : second
                    ? "h-4 rounded bg-[oklch(0.55_0.13_200)]/70"
                    : "h-4 rounded bg-muted"
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function SiteVisual() {
  return (
    <div className="relative h-32 overflow-hidden rounded-lg border border-border bg-background/60">
      <div className="border-b border-border bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          <span className="ml-2 text-[10px] text-muted-foreground">acme.bookingbay.nl</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {[
          "from-primary to-[oklch(0.55_0.18_18)]",
          "from-[oklch(0.55_0.13_200)] to-[oklch(0.45_0.15_220)]",
          "from-[oklch(0.7_0.15_160)] to-[oklch(0.55_0.16_180)]",
        ].map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`h-16 rounded-md bg-gradient-to-br ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
