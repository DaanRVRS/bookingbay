import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WidgetCustomizer } from "./widget-customizer";

export const metadata = { title: "Widget" };

export default async function WidgetsPage() {
  const ctx = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: { id: true, name: true, slug: true, primaryColor: true },
  });
  if (!org) throw new Error("Organization not found");

  const protocol = env.APP_URL.startsWith("https") ? "https" : "http";
  const scriptBaseUrl = `${protocol}://${env.TENANT_DOMAIN}`;
  const previewBaseUrl = `${protocol}://${org.slug}.${env.TENANT_DOMAIN}`;
  const shareBaseUrl = env.APP_URL.replace(/\/$/, "");
  const defaultAccent = org.primaryColor ?? "#ef5934";

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Boek-widget"
          description="Eén widget voor je hele aanbod. Klanten kiezen categorie → product → datums → klaar. Customize de stijl en plak 'm op je eigen site."
        />

        <div className="mt-6">
          <WidgetCustomizer
            slug={org.slug}
            defaultAccent={defaultAccent}
            scriptBaseUrl={scriptBaseUrl}
            previewBaseUrl={previewBaseUrl}
            shareBaseUrl={shareBaseUrl}
          />
        </div>
      </div>
    </div>
  );
}
