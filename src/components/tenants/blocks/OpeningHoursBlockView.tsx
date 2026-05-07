import { Clock } from "lucide-react";
import type { OpeningHoursBlock } from "@/lib/pages/blocks";

export function OpeningHoursBlockView({
  block,
  accent,
}: {
  block: OpeningHoursBlock;
  accent: string;
}) {
  const todayIdx = ((new Date().getDay() + 6) % 7); // mon=0 … sun=6
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{
              background: `color-mix(in oklch, ${accent} 15%, transparent)`,
              color: accent,
            }}
          >
            <Clock className="size-5" />
          </span>
          <div>
            {block.heading && (
              <h2 className="text-2xl font-semibold tracking-tight">{block.heading}</h2>
            )}
            {block.intro && (
              <p className="text-sm text-muted-foreground">{block.intro}</p>
            )}
          </div>
        </div>

        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
          {block.days.map((d, i) => {
            const isToday = i === todayIdx;
            return (
              <li
                key={i}
                className={`flex items-center justify-between px-5 py-3 text-sm ${
                  isToday ? "bg-muted/40 font-semibold" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  {d.label}
                  {isToday && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{
                        background: `color-mix(in oklch, ${accent} 18%, transparent)`,
                        color: accent,
                      }}
                    >
                      Vandaag
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {d.closed ? (
                    <span className="italic">Gesloten</span>
                  ) : d.open && d.close ? (
                    `${d.open} – ${d.close}`
                  ) : (
                    <span className="italic">Op afspraak</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {block.note && (
          <p className="mt-4 text-xs text-muted-foreground">{block.note}</p>
        )}
      </div>
    </section>
  );
}
