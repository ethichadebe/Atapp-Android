import { describe, expect, it } from "vitest";
import { DANCERS, pickDancer } from "./dancers";

describe("pickDancer", () => {
  it("can land on every dancer", () => {
    const steps = DANCERS.map((_, i) => (i + 0.5) / DANCERS.length);
    expect(steps.map((r) => pickDancer(() => r).id)).toEqual(DANCERS.map((d) => d.id));
  });

  it("stays in range at the edges of Math.random", () => {
    expect(pickDancer(() => 0).id).toBe(DANCERS[0].id);
    expect(pickDancer(() => 0.9999999).id).toBe(DANCERS[DANCERS.length - 1].id);
  });

  it("includes both the original dance and the new one", () => {
    expect(DANCERS.map((d) => d.id)).toEqual(["snoop", "zep"]);
  });
});
