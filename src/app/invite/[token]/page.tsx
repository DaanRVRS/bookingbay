import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/marketing/Logo";
import { AcceptInviteButton } from "./accept-invite-button";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export const metadata = { title: "Uitnodiging" };

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const invite = await db.invitation.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

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
        <InviteCard invite={invite} token={token} />
      </main>
    </div>
  );
}

type InviteWithRefs =
  | (NonNullable<Awaited<ReturnType<typeof db.invitation.findUnique>>> & {
      organization: { name: string; slug: string };
      invitedBy: { name: string | null; email: string };
    })
  | null;

async function InviteCard({
  invite,
  token,
}: {
  invite: InviteWithRefs;
  token: string;
}) {
  if (!invite) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <XCircle className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Uitnodiging niet gevonden</h1>
          <p className="text-sm text-muted-foreground">
            Deze link is ongeldig of al gebruikt. Vraag een nieuwe uitnodiging aan.
          </p>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-5 text-sm font-medium"
          >
            Inloggen
          </Link>
        </div>
      </div>
    );
  }

  if (invite.acceptedAt) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[oklch(0.7_0.13_150)]/15 text-[oklch(0.5_0.14_150)]">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Al geaccepteerd</h1>
          <p className="text-sm text-muted-foreground">
            Deze uitnodiging is al gebruikt. Je kan inloggen om naar het dashboard te gaan.
          </p>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Inloggen
          </Link>
        </div>
      </div>
    );
  }

  if (invite.expires < new Date()) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <XCircle className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Uitnodiging verlopen</h1>
          <p className="text-sm text-muted-foreground">
            Deze uitnodiging is langer dan 7 dagen geleden verstuurd. Vraag {invite.invitedBy.name ?? invite.invitedBy.email} om een nieuwe.
          </p>
        </div>
      </div>
    );
  }

  // Check session
  const session = await auth();

  if (!session?.user) {
    // Not logged in — direct to login with return path
    const returnTo = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Uitnodiging</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
          {invite.invitedBy.name ?? invite.invitedBy.email} heeft je uitgenodigd
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Voor de werkruimte <strong>{invite.organization.name}</strong> als{" "}
          <strong>{ROLE_LABELS[invite.role]}</strong>.
        </p>
        <p className="mt-5 rounded-md bg-muted/40 px-3 py-2 text-sm">
          Adres: <span className="font-medium">{invite.email}</span>
        </p>
        <p className="mt-5 text-sm text-muted-foreground">
          Maak eerst een account met dit e-mailadres of log in als je 'm al hebt.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/register?next=${returnTo}&email=${encodeURIComponent(invite.email)}`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Account aanmaken
          </Link>
          <Link
            href={`/login?next=${returnTo}`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium"
          >
            Inloggen
          </Link>
        </div>
      </div>
    );
  }

  if (session.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Uitnodiging</p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight">
          Verkeerd account ingelogd
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Deze uitnodiging is voor <strong>{invite.email}</strong>. Je bent nu ingelogd als{" "}
          <strong>{session.user.email}</strong>.
        </p>
        <Link
          href="/api/sign-out?next=/invite/{token}"
          className="mt-5 inline-flex h-11 items-center rounded-lg border border-border bg-background px-5 text-sm font-medium"
        >
          Uitloggen + opnieuw proberen
        </Link>
      </div>
    );
  }

  // Session valid + email matches — show accept button
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 sm:p-9">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">Uitnodiging</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
        Welkom bij {invite.organization.name}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {invite.invitedBy.name ?? invite.invitedBy.email} heeft je uitgenodigd als{" "}
        <strong>{ROLE_LABELS[invite.role]}</strong>. Klik op accepteren om toegang te krijgen.
      </p>
      <div className="mt-6">
        <AcceptInviteButton token={token} />
      </div>
    </div>
  );
}
