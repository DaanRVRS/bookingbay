import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Wachtwoord vergeten?"
      subtitle="Vul je e-mailadres in. We sturen je een link om je wachtwoord opnieuw in te stellen."
      footer={
        <Link href="/login" className="hover:text-foreground">
          ← Terug naar inloggen
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
