import { describe, expect, it } from "vitest";
import { can, ROLE_LABELS } from "./permissions";

describe("can(role, action)", () => {
  it("OWNER may do everything", () => {
    for (const action of [
      "org:manage",
      "org:billing",
      "members:invite",
      "members:manage",
      "site:customize",
      "catalog:manage",
      "bookings:manage",
      "bookings:view",
    ] as const) {
      expect(can("OWNER", action), `OWNER should be allowed ${action}`).toBe(true);
    }
  });

  it("ADMIN cannot manage org or billing", () => {
    expect(can("ADMIN", "org:manage")).toBe(false);
    expect(can("ADMIN", "org:billing")).toBe(false);
    expect(can("ADMIN", "members:invite")).toBe(true);
    expect(can("ADMIN", "catalog:manage")).toBe(true);
  });

  it("MANAGER can only handle bookings", () => {
    expect(can("MANAGER", "bookings:manage")).toBe(true);
    expect(can("MANAGER", "bookings:view")).toBe(true);
    expect(can("MANAGER", "catalog:manage")).toBe(false);
    expect(can("MANAGER", "members:invite")).toBe(false);
    expect(can("MANAGER", "site:customize")).toBe(false);
  });

  it("VIEWER can only view", () => {
    expect(can("VIEWER", "bookings:view")).toBe(true);
    expect(can("VIEWER", "bookings:manage")).toBe(false);
    expect(can("VIEWER", "catalog:manage")).toBe(false);
  });

  it("has a Dutch label for every role", () => {
    expect(ROLE_LABELS.OWNER).toBe("Eigenaar");
    expect(ROLE_LABELS.ADMIN).toBe("Beheerder");
    expect(ROLE_LABELS.MANAGER).toBe("Manager");
    expect(ROLE_LABELS.VIEWER).toBe("Lezer");
  });
});
