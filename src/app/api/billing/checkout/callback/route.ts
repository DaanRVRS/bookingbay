import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Return-URL waar Mollie de klant heen stuurt na checkout. We weten op
 * dit moment niet meteen de status — de webhook bepaalt de daadwerkelijke
 * uitkomst (omdat de redirect 'lokaal' kan zijn voordat Mollie z'n eigen
 * verwerking heeft afgerond). We sturen 'm terug naar de billing-page
 * met een ?checkout flag zodat de UI een toast kan tonen.
 */
export async function GET() {
  const url = new URL("/dashboard/settings/billing", env.APP_URL);
  url.searchParams.set("checkout", "completed");
  return NextResponse.redirect(url);
}
