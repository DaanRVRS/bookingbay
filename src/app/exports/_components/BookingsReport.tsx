import type {
  OrgHeader,
  BookingExportRecord,
} from "@/lib/bookings/export-data";
import { eur, fmtDate, fmtDateTimeShort, shortRef, statusLabel } from "./format";

export function BookingsReport({
  org,
  bookings,
  filterLabel,
  generatedAt,
  capped,
}: {
  org: OrgHeader;
  bookings: BookingExportRecord[];
  filterLabel: string;
  generatedAt: string;
  capped: boolean;
}) {
  const sum = bookings.reduce((s, b) => s + b.breakdown.total, 0);

  return (
    <div className="text-gray-900">
      <div className="flex items-start justify-between gap-6 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={org.name}
              className="h-10 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-lg font-semibold tracking-tight">
              {org.name}
            </span>
          )}
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Gegenereerd {fmtDateTimeShort(generatedAt)}</p>
        </div>
      </div>

      <div className="mt-5">
        <h1 className="text-xl font-semibold tracking-tight">
          Boekingen-overzicht
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {filterLabel} · {bookings.length}{" "}
          {bookings.length === 1 ? "boeking" : "boekingen"}
        </p>
      </div>

      {capped && (
        <p className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          Let op: alleen de eerste {bookings.length} boekingen zijn opgenomen
          (limiet bereikt). Verfijn de filters voor een volledige export.
        </p>
      )}

      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-300 text-left text-gray-500">
            <th className="py-2 pr-3 font-medium">Ref.</th>
            <th className="py-2 pr-3 font-medium">Klant</th>
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 font-medium">Datum</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pl-3 text-right font-medium">Totaal</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr
              key={b.id}
              className="border-b border-gray-100 align-top break-inside-avoid"
            >
              <td className="py-2 pr-3 font-mono text-[10px] text-gray-500">
                {shortRef(b.id)}
              </td>
              <td className="py-2 pr-3">{b.customerName}</td>
              <td className="py-2 pr-3">{b.itemName}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(b.startAt)}</td>
              <td className="py-2 pr-3">{statusLabel(b.status)}</td>
              <td className="py-2 pl-3 text-right tabular-nums">
                {eur(b.breakdown.total)}
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                Geen boekingen in deze selectie.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300">
            <td colSpan={5} className="py-3 text-sm font-semibold">
              Totaal ({bookings.length})
            </td>
            <td className="py-3 pl-3 text-right text-sm font-semibold tabular-nums">
              {eur(sum)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-8 text-xs text-gray-400">
        {org.name} · boekingen-export
      </p>
    </div>
  );
}
