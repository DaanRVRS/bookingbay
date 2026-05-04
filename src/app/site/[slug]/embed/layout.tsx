import { notFound } from "next/navigation";
import { Geist } from "next/font/google";
import "../../../globals.css";
import { getOrgBySlug } from "@/lib/tenants/queries";
import { EmbedHeightReporter } from "@/components/embed/EmbedHeightReporter";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

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
