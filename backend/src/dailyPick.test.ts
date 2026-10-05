import { describe, expect, it } from "vitest";
import { dayKey, isDayKey, pickObjectId } from "./dailyPick.js";

const ids = Array.from({ length: 5000 }, (_, i) => i * 7 + 3);

describe("art of the day", () => {
  it("is the same for the same date, whatever order the collection is read in", () => {
    const shuffled = [...ids].reverse();
    expect(pickObjectId("2026-10-04", ids)).toBe(pickObjectId("2026-10-04", shuffled));
  });

  it("changes from day to day", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];
    const picks = new Set(days.map((d) => pickObjectId(d, ids)));
    expect(picks.size).toBe(days.length);
  });

  it("survives a dataset refresh that does not remove the winner", () => {
    const winner = pickObjectId("2026-10-04", ids)!;
    // Drop a third of the collection (never the winner), add new objects that
    // lose to it: the day's piece must not move.
    const refreshed = ids.filter((id, i) => id === winner || i % 3 !== 0);
    const extra = Array.from({ length: 2000 }, (_, i) => 1_000_000 + i).filter(
      (id) => pickObjectId("2026-10-04", [winner, id]) === winner,
    );
    expect(pickObjectId("2026-10-04", [...refreshed, ...extra])).toBe(winner);
  });

  it("has nothing to pick from an empty collection", () => {
    expect(pickObjectId("2026-10-04", [])).toBeNull();
  });

  it("uses the UTC calendar day", () => {
    expect(dayKey(new Date("2026-10-04T23:59:59Z"))).toBe("2026-10-04");
    expect(dayKey(new Date("2026-10-05T00:00:00Z"))).toBe("2026-10-05");
    expect(dayKey(new Date("2026-10-05T01:30:00+02:00"))).toBe("2026-10-04");
  });

  it("recognises real dates only", () => {
    expect(isDayKey("2026-10-04")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("today")).toBe(false);
  });
});
