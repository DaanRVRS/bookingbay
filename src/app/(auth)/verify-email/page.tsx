import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { verifyEmailAction } from "@/lib/auth/actions";

export const metadata = { title: "E-mail bevestigen" };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token ?? "";

  if (!token) {
    return (
      <AuthCard
        title="Ongeldige link"
        subtitle="Deze verificatie-link is incompleet."
        footer={<Link href="/login" className="hover:text-foreground">← Terug naar inloggen</Link>}
      >
        <Failed message="Geen token in URL gevonden." />
      </AuthCard>
    );
  }

  const result = await verifyEmailAction(token);

  if (!result.ok) {
    return (
      <AuthCard
        title="Verificatie mislukt"
        subtitle="Deze link werkt niet meer."
        footer={<Link href="/login" className="hover:text-foreground">← Terug naar inloggen</Link>}
      >
        <Failed message={result.error} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="E-mail bevestigd"
      subtitle="Je account is geverifieerd. Je kunt nu inloggen."
      footer={null}
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
          <CheckCircle2 className="size-6" />
        </span>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Doorgaan naar inloggen
        </Link>
      </div>
    </AuthCard>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
        <XCircle className="size-6" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium"
      >
        Inloggen
      </Link>
    </div>
  );
}
