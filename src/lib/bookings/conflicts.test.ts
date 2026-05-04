import { describe, expect, it } from "vitest";
import { isSlotAvailable, rangesOverlap, type BookingStatusForOverlap } from "./conflicts";

const date = (s: string) => new Date(s);

describe("rangesOverlap", () => {
  it("returns false for ranges that don't touch", () => {
    expect(
      rangesOverlap(
        date("2026-05-04T09:00"),
        date("2026-05-04T11:00"),
        date("2026-05-04T13:00"),
        date("2026-05-04T15:00"),
      ),
    ).toBe(false);
  });

  it("returns false for ranges that touch at the boundary", () => {
    expect(
      rangesOverlap(
        date("2026-05-04T09:00"),
        date("2026-05-04T12:00"),
        date("2026-05-04T12:00"),
        date("2026-05-04T15:00"),
      ),
    ).toBe(false);
  });

  it("returns true for partial overlap", () => {
    expect(
      rangesOverlap(
        date("2026-05-04T09:00"),
        date("2026-05-04T13:00"),
        date("2026-05-04T11:00"),
        date("2026-05-04T15:00"),
      ),
    ).toBe(true);
  });

  it("returns true when one range fully contains the other", () => {
    expect(
      rangesOverlap(
        date("2026-05-04T09:00"),
        date("2026-05-04T18:00"),
        date("2026-05-04T11:00"),
        date("2026-05-04T13:00"),
      ),
    ).toBe(true);
  });
});

const booking = (
  id: string,
  start: string,
  end: string,
  status: BookingStatusForOverlap = "CONFIRMED",
) => ({ id, startAt: date(start), endAt: date(end), status });

describe("isSlotAvailable", () => {
  it("is available with no existing bookings", () => {
    expect(
      isSlotAvailable({
        start: date("2026-05-04T10:00"),
        end: date("2026-05-04T14:00"),
        itemQuantity: 1,
        existing: [],
      }),
    ).toEqual({ available: true, usedSlots: 0 });
  });

  it("is NOT available when single-quantity item is double-booked", () => {
    const result = isSlotAvailable({
      start: date("2026-05-04T10:00"),
      end: date("2026-05-04T14:00"),
      itemQuantity: 1,
      existing: [booking("a", "2026-05-04T09:00", "2026-05-04T11:00")],
    });
    expect(result.available).toBe(false);
    expect(result.usedSlots).toBe(1);
  });

  it("is available for multi-instance item below capacity", () => {
    expect(
      isSlotAvailable({
        start: date("2026-05-04T10:00"),
        end: date("2026-05-04T14:00"),
        itemQuantity: 3,
        existing: [
          booking("a", "2026-05-04T09:00", "2026-05-04T11:00"),
          booking("b", "2026-05-04T12:00", "2026-05-04T13:00"),
        ],
      }).available,
    ).toBe(true);
  });

  it("becomes unavailable when capacity is reached", () => {
    expect(
      isSlotAvailable({
        start: date("2026-05-04T10:00"),
        end: date("2026-05-04T14:00"),
        itemQuantity: 2,
        existing: [
          booking("a", "2026-05-04T09:00", "2026-05-04T11:00"),
          booking("b", "2026-05-04T12:00", "2026-05-04T13:00"),
        ],
      }).available,
    ).toBe(false);
  });

  it("ignores CANCELED bookings", () => {
    expect(
      isSlotAvailable({
        start: date("2026-05-04T10:00"),
        end: date("2026-05-04T14:00"),
        itemQuantity: 1,
        existing: [booking("a", "2026-05-04T09:00", "2026-05-04T15:00", "CANCELED")],
      }),
    ).toEqual({ available: true, usedSlots: 0 });
  });

  it("excludes the booking being edited (excludeBookingId)", () => {
    expect(
      isSlotAvailable({
        start: date("2026-05-04T10:00"),
        end: date("2026-05-04T14:00"),
        itemQuantity: 1,
        existing: [booking("being-edited", "2026-05-04T09:00", "2026-05-04T15:00")],
        excludeBookingId: "being-edited",
      }).available,
    ).toBe(true);
  });

  it("treats 12:00-end vs 12:00-start as non-conflicting", () => {
    expect(
      isSlotAvailable({
        start: date("2026-05-04T12:00"),
        end: date("2026-05-04T15:00"),
        itemQuantity: 1,
        existing: [booking("a", "2026-05-04T09:00", "2026-05-04T12:00")],
      }).available,
    ).toBe(true);
  });
});
