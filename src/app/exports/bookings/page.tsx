import { requireOrg } from "@/lib/auth/session";
import {
  buildBookingsWhere,
  bookingSortOrder,
  normalizeSort,
  normalizeDir,
} from "@/lib/bookings/list-query";
import { loadBookingsForExport } from "@/lib/bookings/export-data";
import { PrintControls } from "../_components/PrintControls";
import { BookingsReport } from "../_components/BookingsReport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Boekingen – PDF" };

interface PageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    sort?: string;
    dir?: string;
  }>;
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  RESERVED: "Gereserveerd",
  ACTIVE: "Bezig",
  COMPLETED: "Voltooid",
  CANCELED: "Geannuleerd",
};

function filterLabel(status: string | undefined, q: string): string {
  const parts: string[] = [];
  parts.push(
    status && STATUS_FILTER_LABELS[status]
      ? STATUS_FILTER_LABELS[status]
      : "Alle boekingen",
  );
  if (q) parts.push(`zoek: "${q}"`);
  return parts.join(" · ");
}

export default async function BookingsPrintPage({ searchParams }: PageProps) {
  const ctx = await requireOrg();
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const where = buildBookingsWhere(ctx.organization.id, {
    status: params.status,
    q,
  });
  const orderBy = bookingSortOrder(
    normalizeSort(params.sort),
    normalizeDir(params.dir),
  );

  const { org, bookings, capped } = await loadBookingsForExport(
    ctx.organization.id,
    where,
    orderBy,
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
        <PrintControls />
        <BookingsReport
          org={org}
          bookings={bookings}
          filterLabel={filterLabel(params.status, q)}
          generatedAt={new Date().toISOString()}
          capped={capped}
        />
      </div>
    </main>
  );
}
