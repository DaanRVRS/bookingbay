import type { Role } from "@prisma/client";

export type Action =
  | "org:manage"
  | "org:billing"
  | "members:invite"
  | "members:manage"
  | "site:customize"
  | "catalog:manage"
  | "bookings:manage"
  | "bookings:view";

const matrix: Record<Action, Role[]> = {
  "org:manage": ["OWNER"],
  "org:billing": ["OWNER"],
  "members:invite": ["OWNER", "ADMIN"],
  "members:manage": ["OWNER", "ADMIN"],
  "site:customize": ["OWNER", "ADMIN"],
  "catalog:manage": ["OWNER", "ADMIN"],
  "bookings:manage": ["OWNER", "ADMIN", "MANAGER"],
  "bookings:view": ["OWNER", "ADMIN", "MANAGER", "VIEWER"],
};

export function can(role: Role, action: Action): boolean {
  return matrix[action].includes(role);
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new Error(`Forbidden: ${role} mag geen "${action}"`);
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Eigenaar",
  ADMIN: "Beheerder",
  MANAGER: "Manager",
  VIEWER: "Lezer",
};
