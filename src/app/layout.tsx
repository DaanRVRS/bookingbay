import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BookingBay — Verhuur-administratie zonder gedoe",
    template: "%s · BookingBay",
  },
  description:
    "Het verhuurplatform voor boten, fietsen, auto's, gereedschap en alles wat je verhuurt. Plan, factureer, en geef klanten een eigen boekingssite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
