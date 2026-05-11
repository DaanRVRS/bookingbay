import { AuthCard } from "@/components/auth/AuthCard";
import { TwoFactorVerifyForm } from "./verify-form";

export const metadata = { title: "Twee-staps verificatie" };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function TwoFactorVerifyPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <AuthCard
      title="Verificatiecode"
      subtitle="Open je authenticator-app en voer de 6-cijferige code in. Geen toegang tot de app? Gebruik een backup-code."
    >
      <TwoFactorVerifyForm next={next} />
    </AuthCard>
  );
}
