"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

interface Point {
  ts: number; // createdAt in ms
  amount: number; // totalPrice in euro
}

type RangeKey = "1w" | "2w" | "1m" | "3m" | "6m" | "1j";

const RANGES: { key: RangeKey; label: string; days: number; bucket: "day" | "week" | "month" }[] = [
  { key: "1w", label: "1 week", days: 7, bucket: "day" },
  { key: "2w", label: "2 weken", days: 14, bucket: "day" },
  { key: "1m", label: "1 maand", days: 30, bucket: "day" },
  { key: "3m", label: "3 maanden", days: 90, bucket: "week" },
  { key: "6m", label: "6 maanden", days: 180, bucket: "week" },
  { key: "1j", label: "1 jaar", days: 365, bucket: "month" },
];

const fmtEuro = (n: number) =>
  "€ " +
  n.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/**
 * Monotone-cubic (Fritsch–Carlson) pad: een gladde curve die de datapunten
 * exact raakt en — anders dan een gewone spline — nooit onder 0 duikt of over
 * een piek heen schiet. Dat maakt losstaande omzet-pieken een nette heuvel
 * i.p.v. een scherpe naald, zonder de cijfers te verdraaien.
 */
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const tan: number[] = new Array(n);
  tan[0] = slope[0];
  tan[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tan[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tan[i] = 0;
      tan[i + 1] = 0;
      continue;
    }
    const a = tan[i] / slope[i];
    const b = tan[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tan[i] = t * a * slope[i];
      tan[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const x1 = pts[i].x + dx[i] / 3;
    const y1 = pts[i].y + (tan[i] * dx[i]) / 3;
    const x2 = pts[i + 1].x - dx[i] / 3;
    const y2 = pts[i + 1].y - (tan[i + 1] * dx[i]) / 3;
    d += ` C ${x1.toFixed(2)} ${y1.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}, ${pts[
      i + 1
    ].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
}

export function RevenueChart({ points }: { points: Point[] }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("1m");
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const { buckets, total, prevTotal, peak } = useMemo(() => {
    const now = Date.now();
    const from = now - range.days * 86_400_000;
    const prevFrom = from - range.days * 86_400_000;

    const inRange = points.filter((p) => p.ts >= from && p.ts <= now);
    const inPrev = points.filter((p) => p.ts >= prevFrom && p.ts < from);

    const total = inRange.reduce((s, p) => s + p.amount, 0);
    const prevTotal = inPrev.reduce((s, p) => s + p.amount, 0);

    const out: { label: string; value: number; ts: number }[] = [];
    const start = new Date(from);
    if (range.bucket === "day") {
      start.setHours(0, 0, 0, 0);
      for (let d = new Date(start); d.getTime() <= now; d.setDate(d.getDate() + 1)) {
        const bStart = d.getTime();
        const bEnd = bStart + 86_400_000;
        const value = inRange
          .filter((p) => p.ts >= bStart && p.ts < bEnd)
          .reduce((s, p) => s + p.amount, 0);
        out.push({
          label: d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
          value,
          ts: bStart,
        });
      }
    } else if (range.bucket === "week") {
      start.setHours(0, 0, 0, 0);
      for (let d = new Date(start); d.getTime() <= now; d.setDate(d.getDate() + 7)) {
        const bStart = d.getTime();
        const bEnd = bStart + 7 * 86_400_000;
        const value = inRange
          .filter((p) => p.ts >= bStart && p.ts < bEnd)
          .reduce((s, p) => s + p.amount, 0);
        out.push({
          label: d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
          value,
          ts: bStart,
        });
      }
    } else {
      const m = new Date(from);
      m.setDate(1);
      m.setHours(0, 0, 0, 0);
      for (let d = new Date(m); d.getTime() <= now; d.setMonth(d.getMonth() + 1)) {
        const bStart = d.getTime();
        const nb = new Date(d);
        nb.setMonth(nb.getMonth() + 1);
        const bEnd = nb.getTime();
        const value = inRange
          .filter((p) => p.ts >= bStart && p.ts < bEnd)
          .reduce((s, p) => s + p.amount, 0);
        out.push({
          label: d.toLocaleDateString("nl-NL", { month: "short" }),
          value,
          ts: bStart,
        });
      }
    }
    const peak = out.reduce((mx, b) => Math.max(mx, b.value), 0);
    return { buckets: out, total, prevTotal, peak };
  }, [points, range]);

  const deltaPct =
    prevTotal > 0
      ? Math.round(((total - prevTotal) / prevTotal) * 100)
      : total > 0
        ? 100
        : 0;

  // Responsieve, ONVERVORMDE geometrie: we meten de echte breedte en tekenen
  // de SVG op ware pixel-grootte (geen preserveAspectRatio-rek meer, die de
  // curve en pieken vervormde). Alle coördinaten zijn dus px binnen [0, w].
  const plotRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(cr.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 220;
  const padX = 10;
  const padTop = 26;
  const padBottom = 6;
  const innerW = Math.max(1, w - padX * 2);
  const innerH = H - padTop - padBottom;
  const baseline = padTop + innerH;
  const n = buckets.length;
  const maxV = peak <= 0 ? 1 : peak;

  const x = (i: number) => (n <= 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / maxV) * innerH;

  const pts = buckets.map((b, i) => ({ x: x(i), y: y(b.value) }));
  const linePath = monotonePath(pts);
  const areaPath =
    n > 0
      ? `${linePath} L ${x(n - 1).toFixed(2)} ${baseline.toFixed(2)} L ${x(0).toFixed(
          2,
        )} ${baseline.toFixed(2)} Z`
      : "";

  const lastIdx = n - 1;
  const peakIdx = buckets.findIndex((b) => b.value === peak && b.value > 0);

  const labelIdx = (() => {
    if (n <= 1) return [0];
    const want = Math.min(5, n);
    const s = new Set<number>();
    for (let k = 0; k < want; k++) s.add(Math.round((k / (want - 1)) * (n - 1)));
    return [...s].sort((a, b) => a - b);
  })();

  // Hover: crosshair + tooltip op de dichtstbijzijnde bucket (muis én touch).
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const idx = n <= 1 ? 0 : Math.round(((relX - padX) / innerW) * (n - 1));
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  };
  const clearHover = () => setHoverIdx(null);

  // Edge-aware horizontale uitlijning van een zwevend label op index i.
  const labelShiftX = (i: number) =>
    i === 0 ? "0" : i === lastIdx ? "-100%" : "-50%";

  const active = hoverIdx != null ? buckets[hoverIdx] : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-primary/8 via-primary/3 to-transparent px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Omzet uit boekingen
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {fmtEuro(total)}
            </span>
            {deltaPct !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  deltaPct >= 0 ? "text-[oklch(0.52_0.15_150)]" : "text-destructive"
                }`}
              >
                <TrendingUp className={`size-3.5 ${deltaPct < 0 ? "rotate-180" : ""}`} />
                {deltaPct > 0 ? "+" : ""}
                {deltaPct}%
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            t.o.v. vorige {range.label.toLowerCase()}: {fmtEuro(prevTotal)}
          </p>
        </div>

        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-background p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRangeKey(r.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                r.key === rangeKey
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {total === 0 ? (
          <div className="grid h-[220px] place-items-center rounded-lg border border-dashed border-border bg-background/50 text-sm text-muted-foreground">
            Nog geen omzet in deze periode.
          </div>
        ) : (
          <div>
            <div
              ref={plotRef}
              className="relative w-full touch-pan-y"
              style={{ height: H }}
              role="img"
              aria-label={`Omzetgrafiek — ${fmtEuro(total)} in de gekozen periode`}
              onPointerMove={onPointerMove}
              onPointerLeave={clearHover}
              onPointerDown={onPointerMove}
            >
              {w > 0 && n > 0 && (
                <svg
                  width={w}
                  height={H}
                  viewBox={`0 0 ${w} ${H}`}
                  className="absolute inset-0 block"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.30" />
                      <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Recessieve rasterlijnen */}
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <line
                      key={f}
                      x1={padX}
                      x2={w - padX}
                      y1={baseline - f * innerH}
                      y2={baseline - f * innerH}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="2 6"
                      opacity="0.6"
                    />
                  ))}
                  {/* Basislijn (0) — iets steviger */}
                  <line
                    x1={padX}
                    x2={w - padX}
                    y1={baseline}
                    y2={baseline}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />

                  <path d={areaPath} fill="url(#revFill)" />
                  {/* Zachte halo onder de lijn — geeft diepte zonder filter
                      (en dus zonder risico op zwart-terugval in sommige
                      browsers). */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.14"
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Crosshair bij hover */}
                  {active && hoverIdx != null && (
                    <line
                      x1={x(hoverIdx)}
                      x2={x(hoverIdx)}
                      y1={padTop - 6}
                      y2={baseline}
                      stroke="var(--primary)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                  )}
                </svg>
              )}

              {/* Laatste-punt marker (crisp HTML) — verborgen tijdens hover */}
              {w > 0 && n > 0 && hoverIdx == null && (
                <span
                  className="absolute z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-sm"
                  style={{ left: x(lastIdx), top: y(buckets[lastIdx].value) }}
                  aria-hidden="true"
                />
              )}

              {/* Hover-dot */}
              {w > 0 && active && hoverIdx != null && (
                <span
                  className="absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-md ring-2 ring-primary/25"
                  style={{ left: x(hoverIdx), top: y(active.value) }}
                  aria-hidden="true"
                />
              )}

              {/* Piek-label (crisp HTML) — verborgen tijdens hover */}
              {w > 0 && peakIdx >= 0 && hoverIdx == null && (
                <div
                  className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-sm"
                  style={{
                    left: x(peakIdx),
                    top: y(buckets[peakIdx].value),
                    transform: `translate(${labelShiftX(peakIdx)}, calc(-100% - 10px))`,
                  }}
                >
                  {fmtEuro(peak)}
                </div>
              )}

              {/* Hover-tooltip: datum + exact bedrag */}
              {w > 0 && active && hoverIdx != null && (
                <div
                  className="pointer-events-none absolute z-30 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-lg"
                  style={{
                    left: x(hoverIdx),
                    top: y(active.value),
                    transform: `translate(${labelShiftX(hoverIdx)}, calc(-100% - 14px))`,
                  }}
                >
                  <div className="text-[10px] font-medium text-muted-foreground">
                    {active.label}
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {fmtEuro(active.value)}
                  </div>
                </div>
              )}
            </div>

            {/* X-as labels — gewone HTML, dus altijd scherp */}
            {w > 0 && (
              <div className="relative mt-2 h-4">
                {labelIdx.map((i) => (
                  <span
                    key={`l-${buckets[i].ts}`}
                    className={`absolute text-[10px] tabular-nums transition-colors ${
                      hoverIdx === i ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                    style={{
                      left: x(i),
                      transform: `translateX(${labelShiftX(i)})`,
                    }}
                  >
                    {buckets[i].label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
