import "server-only";
import { NextResponse } from "next/server";
import type { ActionResult } from "@/lib/auth/schemas";

/**
 * De publieke demo draait op één gedeelde, read-only demo-tenant (zie
 * ensureDemoOrg). De ingelogde demo-gebruiker is OWNER zodat 'ie de volledige
 * UI ziet, maar mag NIETS in de database wijzigen — anders zou bezoeker A de
 * wijzigingen van bezoeker B zien (gedeelde tenant) en raakt de demo vervuild.
 *
 * Deze guard blokkeert elke schrijf-actie met een nette, conversie-gerichte
 * melding. Roep 'm bovenaan elke mutatie aan, ná requireOrg()/requireUser().
 */

export const DEMO_READONLY_MESSAGE =
  "Dit is de demo-omgeving — maak een gratis account aan om je wijzigingen te bewaren.";

type MaybeDemoActor =
  | { isDemo?: boolean | null }
  | { user: { isDemo?: boolean | null } };

function actorIsDemo(actor: MaybeDemoActor): boolean {
  if ("user" in actor) return Boolean(actor.user?.isDemo);
  return Boolean(actor.isDemo);
}

/**
 * Voor Server Actions: geeft een ActionResult terug die je direct kunt
 * retourneren als de actor een demo-gebruiker is, anders null.
 *
 *   const blocked = blockDemoWrite(ctx); if (blocked) return blocked;
 */
export function blockDemoWrite(actor: MaybeDemoActor): ActionResult | null {
  if (actorIsDemo(actor)) {
    return { ok: false, error: DEMO_READONLY_MESSAGE };
  }
  return null;
}

/**
 * Voor API-routes: geeft een 403 NextResponse terug als de actor demo is,
 * anders null.
 */
export function blockDemoWriteResponse(actor: MaybeDemoActor): NextResponse | null {
  if (actorIsDemo(actor)) {
    return NextResponse.json(
      { ok: false, error: DEMO_READONLY_MESSAGE },
      { status: 403 },
    );
  }
  return null;
}
