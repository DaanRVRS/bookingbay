"use server";

import type { ActionResult } from "@/lib/auth/schemas";
import { submitLead } from "./core";
import type { LeadInput } from "./schemas";

/**
 * Server Action-wrapper rond {@link submitLead}. De PUBLIEKE contact-widget
 * gebruikt de API-route /api/public/lead (deploy-stabiel in cross-domain
 * iframes); deze action blijft bestaan voor eventueel intern dashboard-gebruik.
 */
export async function createLeadAction(input: LeadInput): Promise<ActionResult> {
  return submitLead(input);
}
