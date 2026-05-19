import { requireOrg } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { WidgetCustomizer } from "./widget-customizer";
import { ensurePublicEmbedKey } from "@/lib/orgs/embed-key";
import { parseUsps, parseTheme } from "@/lib/widget/theme";

export const metadata = { title: "Widget" };

const DEFAULT_ACCENT_FALLBACK = "#ef5934";
const ALLOWED_WIDTHS = ["400", "600", "800", "100%"] as const;
type AllowedWidth = (typeof ALLOWED_WIDTHS)[number];

export default async function WidgetsPage() {
  const ctx = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: ctx.organization.id },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      publicEmbedKey: true,
      widgetAccent: true,
      widgetWidth: true,
      widgetRadius: true,
      widgetShadow: true,
      widgetUsps: true,
      widgetTagline: true,
      widgetDefaultLocale: true,
      widgetTheme: true,
    },
  });
  if (!org) throw new Error("Organization not found");

  const publicEmbedKey =
    org.publicEmbedKey ?? (await ensurePublicEmbedKey(org.id));

  const protocol = env.APP_URL.startsWith("https") ? "https" : "http";
  const scriptBaseUrl = `${protocol}://${env.TENANT_DOMAIN}`;
  const previewBaseUrl = `${protocol}://${org.slug}.${env.TENANT_DOMAIN}`;
  const shareBaseUrl = env.APP_URL.replace(/\/$/, "");
  const defaultAccent = org.primaryColor ?? DEFAULT_ACCENT_FALLBACK;

  const initialDesign = {
    accent: org.widgetAccent ?? defaultAccent,
    width: (ALLOWED_WIDTHS as readonly string[]).includes(org.widgetWidth)
      ? (org.widgetWidth as AllowedWidth)
      : ("600" as AllowedWidth),
    radius: org.widgetRadius,
    shadow: org.widgetShadow,
    usps: parseUsps(org.widgetUsps),
    tagline: org.widgetTagline ?? "",
    defaultLocale: org.widgetDefaultLocale ?? "nl",
    theme: parseTheme(org.widgetTheme),
  };

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
            orgName={org.name}
            logoUrl={org.logoUrl}
            publicEmbedKey={publicEmbedKey}
            initialDesign={initialDesign}
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
