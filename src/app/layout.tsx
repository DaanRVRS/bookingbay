import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SkipLink } from "@/components/a11y/SkipLink";
import "./globals.css";

// Plus Jakarta Sans — meer karakter dan het neutrale Geist, zonder in te
// leveren op leesbaarheid. We houden de CSS-var-naam (--font-geist-sans)
// gelijk zodat globals/tailwind ongemoeid blijven.
const geistSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BookingBay — Boekingssoftware voor watersport & recreatie",
    template: "%s · BookingBay",
  },
  description:
    "Het boekingsplatform voor botenverhuur, sup, kano, e-bikes en recreatie. Laat klanten online reserveren via je eigen site — met planning, borg en facturatie, zonder commissie aan platforms.",
};

// Plausible staat bewust NIET hier in de root-layout: die zou dan ook op
// klantsites, /book, het klantportaal en de embed-iframes laden. Het script
// zit in <PlausibleScript /> en wordt alleen door de marketing-header, de
// inlog-layout, het dashboard en de admin gerenderd.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
