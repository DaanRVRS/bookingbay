import type {
  OrgHeader,
  BookingExportRecord,
} from "@/lib/bookings/export-data";
import {
  eur,
  fmtDate,
  fmtDateLong,
  fmtTime,
  paymentLabel,
  shortRef,
  statusLabel,
} from "./format";

function OrgBanner({ org }: { org: OrgHeader }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-gray-200 pb-5">
      <div className="flex items-center gap-3">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logoUrl}
            alt={org.name}
            className="h-12 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            {org.name}
          </span>
        )}
      </div>
      <div className="text-right text-xs text-gray-500">
        {org.logoUrl && (
          <p className="font-medium text-gray-900">{org.name}</p>
        )}
        {org.contactEmail && <p>{org.contactEmail}</p>}
        {org.contactPhone && <p>{org.contactPhone}</p>}
      </div>
    </div>
  );
}

export function BookingDocument({
  org,
  booking,
}: {
  org: OrgHeader;
  booking: BookingExportRecord;
}) {
  const b = booking;
  const sameDay =
    new Date(b.startAt).toDateString() === new Date(b.endAt).toDateString();
  const pay = paymentLabel(b.paymentStatus);

  return (
    <div className="text-gray-900">
      <OrgBanner org={org} />

      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Boekingsbevestiging
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Referentie {shortRef(b.id)}
          </p>
        </div>
        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700">
          {statusLabel(b.status)}
        </span>
      </div>

      {/* Klant + item */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <Field label="Klant">
          <p className="font-medium">{b.customerName}</p>
          {b.customerEmail && (
            <p className="text-sm text-gray-600">{b.customerEmail}</p>
          )}
          {b.customerPhone && (
            <p className="text-sm text-gray-600">{b.customerPhone}</p>
          )}
        </Field>
        <Field label="Item">
          <p className="font-medium">{b.itemName}</p>
        </Field>
      </div>

      {/* Wanneer */}
      <div className="mt-6">
        <Label>Wanneer</Label>
        {sameDay ? (
          <p className="mt-1 text-base">
            <span className="font-medium">{fmtDateLong(b.startAt)}</span>{" "}
            <span className="text-gray-600">
              · {fmtTime(b.startAt)} – {fmtTime(b.endAt)}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-base">
            <span className="font-medium">{fmtDate(b.startAt)}</span>{" "}
            {fmtTime(b.startAt)} <span className="text-gray-400">→</span>{" "}
            <span className="font-medium">{fmtDate(b.endAt)}</span>{" "}
            {fmtTime(b.endAt)}
          </p>
        )}
      </div>

      {/* Prijsopbouw */}
      <div className="mt-7 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <tbody>
            <PriceRow label={`Huur (${b.breakdown.unit})`} value={b.breakdown.subtotal} />
            {b.breakdown.feeLines.map((f) => (
              <PriceRow key={f.label} label={f.label} value={f.amount} muted />
            ))}
            {b.breakdown.addonList.map((a, idx) => (
              <PriceRow
                key={`${a.itemId}-${idx}`}
                label={`${a.name}${a.quantity > 1 ? ` × ${a.quantity}` : ""}`}
                value={(Number(a.unitPrice) || 0) * (Number(a.quantity) || 0)}
                muted
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td className="px-4 py-3 text-base font-semibold">Totaal</td>
              <td className="px-4 py-3 text-right text-base font-semibold tabular-nums">
                {eur(b.breakdown.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {pay && (
        <p className="mt-3 text-sm text-gray-600">
          Betaalstatus: <span className="font-medium text-gray-900">{pay}</span>
          {b.paymentProvider ? ` (${b.paymentProvider})` : ""}
        </p>
      )}

      {b.notes && (
        <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Opmerking</p>
          <p className="mt-1 whitespace-pre-line">{b.notes}</p>
        </div>
      )}

      <p className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-400">
        {org.name}
        {org.contactEmail ? ` · ${org.contactEmail}` : ""}
        {org.contactPhone ? ` · ${org.contactPhone}` : ""}
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className={`px-4 py-2.5 ${muted ? "text-gray-600" : ""}`}>{label}</td>
      <td
        className={`px-4 py-2.5 text-right tabular-nums ${
          muted ? "text-gray-600" : ""
        }`}
      >
        {eur(value)}
      </td>
    </tr>
  );
}
