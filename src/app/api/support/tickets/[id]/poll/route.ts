import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

/**
 * Lightweight polling endpoint for the ticket-detail page. Returns the
 * current message count and timestamps of the last staff/user replies so
 * the client can detect een nieuwe reply zonder de hele pagina te re-fetchen.
 *
 * Auth: must be platform-admin OR member of the ticket's organization.
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  const user = await requireUser();
  const { id } = await ctx.params;

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      status: true,
      lastMessageAt: true,
      lastStaffReplyAt: true,
      lastUserReplyAt: true,
      _count: { select: { messages: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!user.isAdmin) {
    const member = await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: ticket.organizationId,
        },
      },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    messageCount: ticket._count.messages,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    lastStaffReplyAt: ticket.lastStaffReplyAt?.toISOString() ?? null,
    lastUserReplyAt: ticket.lastUserReplyAt?.toISOString() ?? null,
    status: ticket.status,
  });
}
