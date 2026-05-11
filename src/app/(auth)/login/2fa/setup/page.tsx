import { AuthCard } from "@/components/auth/AuthCard";
import { TwoFactorSetupForm } from "@/components/auth/TwoFactorSetupForm";

export const metadata = { title: "2FA instellen" };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function ForcedTwoFactorSetupPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <AuthCard
      title="Twee-staps verificatie instellen"
      subtitle="Als platform-admin is 2FA verplicht. Stel het nu in om verder te gaan."
    >
      <TwoFactorSetupForm mode="forced" next={next} />
    </AuthCard>
  );
}
