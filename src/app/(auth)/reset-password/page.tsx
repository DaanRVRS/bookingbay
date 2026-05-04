import Link from "next/link";
import { XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Wachtwoord resetten" };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token ?? "";

  if (!token) {
    return (
      <AuthCard
        title="Ongeldige link"
        subtitle="De reset-link is incompleet."
        footer={<Link href="/login" className="hover:text-foreground">← Terug naar inloggen</Link>}
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <XCircle className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">Geen token in URL gevonden.</p>
          <Link
            href="/forgot-password"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium"
          >
            Vraag nieuwe link aan
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Stel een nieuw wachtwoord in"
      subtitle="Kies iets dat je nog nooit eerder hebt gebruikt."
      footer={<Link href="/login" className="hover:text-foreground">← Terug naar inloggen</Link>}
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
