import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearPortalSession } from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "Slug vereist" }, { status: 400 });

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (org) await clearPortalSession(org.id);

  return NextResponse.json({ ok: true });
}
