import { Logo } from "@/components/marketing/Logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div
        aria-hidden
        className="bg-grid bg-radial-fade pointer-events-none absolute inset-0 -z-10 opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl"
      />

      <header className="px-6 py-5">
        <Logo />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        {children}
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">← Terug naar bookingbay.nl</Link>
      </footer>
    </div>
  );
}
