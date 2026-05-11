import { z } from "zod";

export const POLL_STATUSES = ["draft", "open", "closed"] as const;

export const createPollSchema = z.object({
  title: z.string().min(2, "Titel te kort").max(140),
  question: z.string().min(2, "Vraag te kort").max(400),
  options: z
    .array(z.string().min(1, "Lege optie").max(140))
    .min(2, "Minimaal 2 opties")
    .max(6, "Maximaal 6 opties"),
  allowMultiple: z.boolean().default(false),
  publishNow: z.boolean().default(true),
});

export const voteSchema = z.object({
  pollId: z.string().min(1),
  optionIndices: z.array(z.number().int().nonnegative()).min(1, "Kies een optie"),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
