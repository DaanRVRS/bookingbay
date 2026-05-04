import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "./register-form";
import { auth } from "@/lib/auth";

export const metadata = { title: "Registreren" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthCard
      title="Begin je 14-daagse trial"
      subtitle="Geen creditcard nodig. Stop wanneer je wil."
      footer={
        <>
          Heb je al een account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Inloggen
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
