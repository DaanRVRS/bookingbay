import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { OrgSubNav } from "./sub-nav";

export default async function AdminOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const org = await db.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  });
  if (!org) notFound();

  const protocol = env.APP_URL.startsWith("https") ? "https" : "http";
  const tenantUrl = `${protocol}://${org.slug}.${env.TENANT_DOMAIN}`;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Alle organisaties
        </Link>

        <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{org.slug}</span>
              {" · "}
              <a
                href={tenantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
              >
                {tenantUrl}
                <ExternalLink className="size-3" />
              </a>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aangemaakt {format(org.createdAt, "d MMM yyyy", { locale: nl })}
            </p>
          </div>
        </div>

        <OrgSubNav organizationId={org.id} />

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
