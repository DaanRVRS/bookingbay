import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = {
  title: "Blog",
  description: "Tips, updates en verhalen over verhuurbeheer met BookingBay.",
};

export default function BlogPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-medium text-primary">Blog</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Verhalen en tips voor verhuurders
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            We schrijven nog niet, maar dat komt eraan.
          </p>

          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="size-6" />
            </span>
            <h2 className="text-xl font-semibold tracking-tight">
              Binnenkort live
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              We bereiden artikelen voor over verhuur-administratie, prijs­strategie,
              klantcommunicatie en updates over BookingBay zelf. Wil je een seintje
              krijgen wanneer ze online staan?
            </p>
            <Link
              href="/contact"
              className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Hou me op de hoogte <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
