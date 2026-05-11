import { z } from "zod";

export const TICKET_CATEGORIES = [
  { value: "general", label: "Algemeen" },
  { value: "billing", label: "Facturatie" },
  { value: "bug", label: "Bug/storing" },
  { value: "feature", label: "Feature-verzoek" },
  { value: "other", label: "Overig" },
] as const;

export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const TICKET_STATUSES = [
  "OPEN",
  "AWAITING_USER",
  "AWAITING_SUPPORT",
  "RESOLVED",
  "CLOSED",
] as const;

export const PRIORITY_LABELS: Record<(typeof TICKET_PRIORITIES)[number], string> = {
  LOW: "Laag",
  NORMAL: "Normaal",
  HIGH: "Hoog",
  URGENT: "Urgent",
};

export const STATUS_LABELS: Record<(typeof TICKET_STATUSES)[number], string> = {
  OPEN: "Open",
  AWAITING_USER: "Wacht op klant",
  AWAITING_SUPPORT: "Wacht op support",
  RESOLVED: "Opgelost",
  CLOSED: "Gesloten",
};

export const createTicketSchema = z.object({
  subject: z.string().min(3, "Onderwerp is te kort").max(160),
  category: z.enum(["general", "billing", "bug", "feature", "other"]).default("general"),
  priority: z.enum(TICKET_PRIORITIES).default("NORMAL"),
  body: z.string().min(5, "Bericht is te kort").max(5000),
});

export const replyTicketSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1, "Bericht is verplicht").max(5000),
});

export const adminUpdateTicketSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;
export type AdminUpdateTicketInput = z.infer<typeof adminUpdateTicketSchema>;
