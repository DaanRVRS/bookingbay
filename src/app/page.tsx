import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
              B
            </span>
            BookingBay
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Inloggen
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[var(--primary)] px-4 py-1.5 text-[var(--primary-foreground)] hover:opacity-90"
            >
              Probeer gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium tracking-wide text-[var(--primary)] uppercase">
              Verhuur-administratie zonder gedoe
            </p>
            <h1 className="text-5xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
              Eén plek voor je <span className="text-[var(--primary)]">planning</span>, je{" "}
              <span className="text-[var(--primary)]">klanten</span>, en je{" "}
              <span className="text-[var(--primary)]">boekingssite</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--muted-foreground)]">
              BookingBay is gebouwd voor verhuurbedrijven die nog met papier of Excel werken —
              boten, fietsen, auto&apos;s, gereedschap, party-verhuur, je kiest het zelf. Eén plan,
              één dashboard, en een eigen klantgerichte website.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--primary)] px-6 font-medium text-[var(--primary-foreground)] hover:opacity-90"
              >
                Start je 14-daagse trial
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--border)] px-6 font-medium hover:bg-[var(--accent)]"
              >
                Hoe het werkt
              </Link>
            </div>
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              Geen creditcard nodig · Nederlandstalig · Gehost in Europa
            </p>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-[var(--border)] bg-[var(--muted)]/40 py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
            {[
              {
                title: "Universeel toepasbaar",
                body: "Definieer zelf je categorieën — boten, fietsen, gereedschap, golfkarren. Wat je verhuurt bepaal jij.",
              },
              {
                title: "Planning zonder dubbel-boekingen",
                body: "Kalender per item met automatische conflictdetectie. Niet meer in Excel zoeken of iets nog vrij is.",
              },
              {
                title: "Eigen boekingssite",
                body: "Elke organisatie krijgt een klantgerichte website met eigen kleuren, logo en items.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
              >
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-[var(--muted-foreground)] sm:flex-row">
          <p>© {new Date().getFullYear()} BookingBay</p>
          <p>
            Gebouwd in Nederland ·{" "}
            <Link href="/api/health" className="hover:text-[var(--foreground)]">
              status
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
