import { z } from "zod";

export const ROLES = ["OWNER", "ADMIN", "MANAGER", "VIEWER"] as const;

export const inviteSchema = z.object({
  email: z.email("Ongeldig e-mailadres"),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]).default("VIEWER"),
});

export const updateRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(ROLES),
});

export const removeMemberSchema = z.object({
  membershipId: z.string().min(1),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
