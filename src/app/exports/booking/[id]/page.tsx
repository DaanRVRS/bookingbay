import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth/session";
import { loadBookingForExport } from "@/lib/bookings/export-data";
import { PrintControls } from "../../_components/PrintControls";
import { BookingDocument } from "../../_components/BookingDocument";

export const dynamic = "force-dynamic";
export const metadata = { title: "Boeking – PDF" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPrintPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await requireOrg();
  const data = await loadBookingForExport(ctx.organization.id, id);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-8 print:px-0 print:py-0">
        <PrintControls />
        <BookingDocument org={data.org} booking={data.booking} />
      </div>
    </main>
  );
}
