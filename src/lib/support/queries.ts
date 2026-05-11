import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function listTicketsForOrg(organizationId: string) {
  return db.supportTicket.findMany({
    where: { organizationId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });
}

export async function getTicketForOrg(organizationId: string, ticketId: string) {
  return db.supportTicket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function getTicketForAdmin(ticketId: string) {
  return db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      organization: { select: { id: true, name: true, slug: true, plan: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export interface AdminTicketFilters {
  status?: "open" | "closed" | "all";
  q?: string;
}

export async function listTicketsForAdmin(filters: AdminTicketFilters = {}) {
  const status = filters.status ?? "open";
  const where: Prisma.SupportTicketWhereInput = {};
  if (status === "open") {
    where.status = { in: ["OPEN", "AWAITING_SUPPORT", "AWAITING_USER"] };
  } else if (status === "closed") {
    where.status = { in: ["RESOLVED", "CLOSED"] };
  }
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { organization: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  return db.supportTicket.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      organization: { select: { id: true, name: true, slug: true, plan: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
    take: 200,
  });
}

export async function countOpenTicketsForAdmin() {
  return db.supportTicket.count({
    where: {
      status: { in: ["OPEN", "AWAITING_SUPPORT", "AWAITING_USER"] },
    },
  });
}
