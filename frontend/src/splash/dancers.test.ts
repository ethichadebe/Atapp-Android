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

  it("includes the original dance and the traced ones", () => {
    expect(DANCERS.map((d) => d.id)).toEqual(["snoop", "zep", "chad", "milan", "satin"]);
  });

  it("gives every dancer its own icons", () => {
    expect(new Set(DANCERS.map((d) => d.icon)).size).toBe(DANCERS.length);
    expect(new Set(DANCERS.map((d) => d.touchIcon)).size).toBe(DANCERS.length);
  });
});
