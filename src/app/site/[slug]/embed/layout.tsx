import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../../../globals.css";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { EmbedHeightReporter } from "@/components/embed/EmbedHeightReporter";

// Zelfde huisletter als de rest van BookingBay. CSS-var-naam blijft
// --font-geist-sans zodat globals/tailwind ongemoeid blijven.
const geist = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Niet gevonden" };
  return {
    title: `${org.name} — embed`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const accent = org.primaryColor ?? "#ef5934";

  return (
    <div
      className={`${geist.variable} font-sans antialiased`}
      style={{ ["--tenant-accent" as string]: accent, background: "transparent" }}
    >
      <EmbedHeightReporter />
      <div className="bg-background">{children}</div>
    </div>
  );
}
