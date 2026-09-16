import { describe, expect, it } from "vitest";
import { addDays, addMonths, subDays, subMonths } from "date-fns";
import { RETENTION } from "@/lib/company";
import {
  decideOrgRetention,
  orgDeletionSchedule,
  orgStoppedAt,
  plannedDeletionDate,
  type OrgLifecycleFields,
} from "./org-lifecycle";

// Vast "nu" zodat de tests niet van de kalender afhangen.
const NOW = new Date("2026-09-16T04:10:00.000Z");

function org(over: Partial<OrgLifecycleFields> = {}): OrgLifecycleFields {
  return {
    subscriptionStatus: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    paidUntil: null,
    suspendedAt: null,
    deletionWarnedAt: null,
    ...over,
  };
}

describe("orgStoppedAt — wanneer is een organisatie gestopt?", () => {
  it("lopende proefperiode = niet gestopt", () => {
    expect(orgStoppedAt(org({ trialEndsAt: addDays(NOW, 3) }), NOW)).toBeNull();
  });

  it("verlopen proefperiode zonder betaling = gestopt op de einddatum van de proef", () => {
    const trialEndsAt = subDays(NOW, 40);
    expect(orgStoppedAt(org({ trialEndsAt, suspendedAt: subDays(NOW, 33) }), NOW)).toEqual(
      trialEndsAt,
    );
  });

  it("actief of past_due Mollie-abonnement = niet gestopt, ook met verouderde periode-einddatum", () => {
    expect(
      orgStoppedAt(
        org({ subscriptionStatus: "active", currentPeriodEnd: subMonths(NOW, 14) }),
        NOW,
      ),
    ).toBeNull();
    expect(
      orgStoppedAt(org({ subscriptionStatus: "past_due", currentPeriodEnd: subDays(NOW, 5) }), NOW),
    ).toBeNull();
  });

  it("opgezegd maar betaalde periode loopt nog = niet gestopt", () => {
    expect(
      orgStoppedAt(
        org({ subscriptionStatus: "canceled", currentPeriodEnd: addDays(NOW, 10) }),
        NOW,
      ),
    ).toBeNull();
  });

  it("opgezegd en periode voorbij = gestopt op het einde van de periode", () => {
    const currentPeriodEnd = subDays(NOW, 2);
    expect(
      orgStoppedAt(
        org({ subscriptionStatus: "canceled", currentPeriodEnd, suspendedAt: subDays(NOW, 1) }),
        NOW,
      ),
    ).toEqual(currentPeriodEnd);
  });

  it("legacy paidUntil verlopen = gestopt op paidUntil, ook als er nog een oudere trialdatum staat", () => {
    const paidUntil = subDays(NOW, 20);
    expect(orgStoppedAt(org({ trialEndsAt: subMonths(NOW, 6), paidUntil }), NOW)).toEqual(
      paidUntil,
    );
  });

  it("legacy paidUntil in de toekomst = niet gestopt", () => {
    expect(
      orgStoppedAt(org({ trialEndsAt: subMonths(NOW, 6), paidUntil: addDays(NOW, 10) }), NOW),
    ).toBeNull();
  });

  it("zonder enige einddatum: alleen een suspensie telt als stopmoment", () => {
    expect(orgStoppedAt(org(), NOW)).toBeNull();
    const suspendedAt = subMonths(NOW, 2);
    expect(orgStoppedAt(org({ suspendedAt }), NOW)).toEqual(suspendedAt);
  });
});

describe("orgDeletionSchedule", () => {
  it("verwijderdatum = stopdatum + orgDeleteMonths, waarschuwing orgDeleteWarnDays eerder", () => {
    const trialEndsAt = subMonths(NOW, 2);
    const s = orgDeletionSchedule(org({ trialEndsAt }), NOW);
    expect(s).not.toBeNull();
    expect(s?.stoppedAt).toEqual(trialEndsAt);
    expect(s?.deleteAt).toEqual(addMonths(trialEndsAt, RETENTION.orgDeleteMonths));
    expect(s?.warnAt).toEqual(
      subDays(addMonths(trialEndsAt, RETENTION.orgDeleteMonths), RETENTION.orgDeleteWarnDays),
    );
  });

  it("geen schema voor een lopende organisatie", () => {
    expect(orgDeletionSchedule(org({ trialEndsAt: addDays(NOW, 1) }), NOW)).toBeNull();
  });
});

describe("decideOrgRetention — wie krijgt wanneer een mail, wie wordt wanneer verwijderd", () => {
  it("lopende organisatie: niets doen", () => {
    expect(decideOrgRetention(org({ trialEndsAt: addDays(NOW, 5) }), NOW)).toBe("none");
    expect(
      decideOrgRetention(
        org({ subscriptionStatus: "active", currentPeriodEnd: addDays(NOW, 20) }),
        NOW,
      ),
    ).toBe("none");
  });

  it("net gestopt: niets doen (nog ver van de waarschuwingsdatum)", () => {
    expect(decideOrgRetention(org({ trialEndsAt: subMonths(NOW, 2) }), NOW)).toBe("none");
  });

  it("dag vóór de waarschuwingsdatum: niets; op de waarschuwingsdatum: waarschuwen", () => {
    const stoppedAt = subDays(
      subMonths(NOW, RETENTION.orgDeleteMonths),
      -RETENTION.orgDeleteWarnDays,
    );
    // stoppedAt + 12 mnd − 30 d == NOW → warnAt == NOW
    expect(decideOrgRetention(org({ trialEndsAt: stoppedAt }), NOW)).toBe("warn");
    expect(decideOrgRetention(org({ trialEndsAt: addDays(stoppedAt, 1) }), NOW)).toBe("none");
  });

  it("al gewaarschuwd, termijn nog niet om: niets doen (geen tweede mail)", () => {
    const stoppedAt = subMonths(NOW, 11);
    expect(
      decideOrgRetention(org({ trialEndsAt: stoppedAt, deletionWarnedAt: subDays(NOW, 5) }), NOW),
    ).toBe("none");
  });

  it("gewaarschuwd en termijn om, maar nog geen orgDeleteWarnDays gewacht: niets doen", () => {
    const stoppedAt = subMonths(NOW, RETENTION.orgDeleteMonths + 1);
    expect(
      decideOrgRetention(
        org({
          trialEndsAt: stoppedAt,
          deletionWarnedAt: subDays(NOW, RETENTION.orgDeleteWarnDays - 1),
        }),
        NOW,
      ),
    ).toBe("none");
  });

  it("gewaarschuwd, termijn om én wachttijd voorbij: verwijderen", () => {
    const stoppedAt = subMonths(NOW, RETENTION.orgDeleteMonths);
    expect(
      decideOrgRetention(
        org({
          trialEndsAt: stoppedAt,
          deletionWarnedAt: subDays(NOW, RETENTION.orgDeleteWarnDays),
        }),
        NOW,
      ),
    ).toBe("delete");
  });

  it("al jaren gestopt maar nooit gewaarschuwd: eerst waarschuwen, niet meteen verwijderen", () => {
    expect(
      decideOrgRetention(
        org({ trialEndsAt: subMonths(NOW, 36), suspendedAt: subMonths(NOW, 35) }),
        NOW,
      ),
    ).toBe("warn");
  });

  it("al jaren gestopt en orgDeleteWarnDays geleden gewaarschuwd: verwijderen", () => {
    expect(
      decideOrgRetention(
        org({
          trialEndsAt: subMonths(NOW, 36),
          deletionWarnedAt: subDays(NOW, RETENTION.orgDeleteWarnDays),
        }),
        NOW,
      ),
    ).toBe("delete");
  });

  it("weer actief na een waarschuwing: waarschuwing wissen", () => {
    expect(
      decideOrgRetention(
        org({
          subscriptionStatus: "active",
          currentPeriodEnd: addDays(NOW, 25),
          deletionWarnedAt: subDays(NOW, 10),
        }),
        NOW,
      ),
    ).toBe("clear-warning");
    // Zonder einddatum en zonder suspensie weten we niets → ook wissen.
    expect(decideOrgRetention(org({ deletionWarnedAt: subDays(NOW, 10) }), NOW)).toBe(
      "clear-warning",
    );
  });

  it("verouderde waarschuwing van een eerdere stop telt niet: opnieuw waarschuwen, nooit direct verwijderen", () => {
    // Eerder gestopt en gewaarschuwd, daarna hervat en 13 maanden geleden
    // opnieuw gestopt: de oude waarschuwing ligt vóór de nieuwe stopdatum.
    const stoppedAt = subMonths(NOW, 13);
    const o = org({ currentPeriodEnd: stoppedAt, deletionWarnedAt: subMonths(NOW, 20) });
    expect(decideOrgRetention(o, NOW)).toBe("warn");
  });

  it("organisatie zonder einddatum en zonder suspensie wordt nooit aangeraakt", () => {
    expect(decideOrgRetention(org(), NOW)).toBe("none");
  });
});

describe("plannedDeletionDate — datum in de mail", () => {
  it("normaal: de verwijderdatum uit het schema", () => {
    const stoppedAt = subMonths(NOW, 11);
    const s = orgDeletionSchedule(org({ trialEndsAt: stoppedAt }), NOW);
    expect(s).not.toBeNull();
    if (!s) return;
    expect(plannedDeletionDate(s, NOW)).toEqual(s.deleteAt);
  });

  it("termijn al om bij de waarschuwing: orgDeleteWarnDays na de waarschuwing", () => {
    const s = orgDeletionSchedule(org({ trialEndsAt: subMonths(NOW, 30) }), NOW);
    expect(s).not.toBeNull();
    if (!s) return;
    expect(plannedDeletionDate(s, NOW)).toEqual(addDays(NOW, RETENTION.orgDeleteWarnDays));
  });
});
