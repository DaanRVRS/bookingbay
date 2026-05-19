"use client";

import { useMemo, useState } from "react";
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

    // Buckets
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

  // SVG geometry
  const W = 760;
  const H = 220;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = buckets.length;
  const maxV = peak <= 0 ? 1 : peak;

  const x = (i: number) =>
    n <= 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW;
  const y = (v: number) => padTop + innerH - (v / maxV) * innerH;

  const linePath = buckets
    .map((b, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(b.value).toFixed(1)}`)
    .join(" ");
  const areaPath =
    n > 0
      ? `${linePath} L ${x(n - 1).toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : "";

  // X-as labels: max ~5 gelijk verdeeld, inclusief eerste + laatste, en
  // nooit twee labels te dicht op elkaar (voorkomt overlap aan de rand).
  const labelIdx = (() => {
    if (n <= 1) return new Set<number>([0]);
    const want = Math.min(5, n);
    const s = new Set<number>();
    for (let k = 0; k < want; k++) {
      s.add(Math.round((k / (want - 1)) * (n - 1)));
    }
    return s;
  })();

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
                  deltaPct >= 0
                    ? "text-[oklch(0.52_0.15_150)]"
                    : "text-destructive"
                }`}
              >
                <TrendingUp
                  className={`size-3.5 ${deltaPct < 0 ? "rotate-180" : ""}`}
                />
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
          <div className="grid h-[200px] place-items-center rounded-lg border border-dashed border-border bg-background/50 text-sm text-muted-foreground">
            Nog geen omzet in deze periode.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[220px] w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Omzetgrafiek"
          >
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--primary)"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Horizontale rasterlijnen */}
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1={padX}
                x2={W - padX}
                y1={padTop + innerH - f * innerH}
                y2={padTop + innerH - f * innerH}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity="0.5"
              />
            ))}

            <path d={areaPath} fill="url(#revFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Punten + waarde-label op de piek */}
            {buckets.map((b, i) => {
              const isPeak = b.value === peak && b.value > 0;
              const isLast = i === n - 1;
              if (!isPeak && !isLast) return null;
              return (
                <g key={b.ts}>
                  <circle
                    cx={x(i)}
                    cy={y(b.value)}
                    r={isLast ? 4 : 3}
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                  {isPeak && (
                    <text
                      x={x(i)}
                      y={y(b.value) - 10}
                      textAnchor="middle"
                      className="fill-foreground text-[11px] font-semibold"
                    >
                      {fmtEuro(b.value)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X-as labels */}
            {buckets.map((b, i) =>
              labelIdx.has(i) ? (
                <text
                  key={`l-${b.ts}`}
                  x={x(i)}
                  y={H - 8}
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  className="fill-muted-foreground text-[10px]"
                >
                  {b.label}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
