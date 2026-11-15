import { describe, expect, it } from "vitest";
import { moriReply } from "@/lib/mori";
describe("Mori", () => {
  it("says it could not find a trip that is not in the data", () => {
    expect(moriReply("Show my trip to Tokyo")).toContain("I could not find any");
  });
  it("grades a likely 9, never a 10", () => {
    const r = moriReply("Would my Charizard grade well?");
    expect(r).not.toMatch(/\b10\b/);
  });
});
import { guestReply } from "@/lib/mori";
describe("Guest Mori", () => {
  it("does not invent a collection for guests", () => {
    expect(guestReply("what do I own?")).toContain("I could not find any");
  });
});
