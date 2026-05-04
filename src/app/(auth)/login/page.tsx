import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "./login-form";
import { auth } from "@/lib/auth";

export const metadata = { title: "Inloggen" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <AuthCard
      title="Welkom terug"
      subtitle="Log in op je BookingBay-account."
      footer={
        <>
          Nog geen account?{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Registreer
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
