import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResendVerification } from "./resend-verification";

export const metadata = { title: "Check je inbox" };

interface PageProps {
  searchParams: Promise<{ email?: string; context?: string }>;
}

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email ?? "";
  const isVerify = params.context === "verify";

  return (
    <AuthCard
      title={isVerify ? "Bevestig je e-mail" : "Check je inbox"}
      subtitle={
        isVerify
          ? "We hebben een bevestigingslink gestuurd. Klik 'm aan om door te gaan."
          : "We hebben een magic link gestuurd. Klik 'm aan om in te loggen — de link verloopt na 10 minuten."
      }
      footer={
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          ← Terug naar inloggen
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </span>
        {email && (
          <p className="text-sm text-muted-foreground">
            Verstuurd naar <span className="text-foreground font-medium">{email}</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Niets ontvangen? Check je spam-folder. Of {isVerify
            ? <ResendVerification email={email} />
            : <Link href="/login" className="text-foreground hover:underline">probeer opnieuw</Link>}.
        </p>
      </div>
    </AuthCard>
  );
}
