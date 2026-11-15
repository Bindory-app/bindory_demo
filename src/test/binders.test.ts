import { describe, it, expect } from "vitest";
import { binderPages, validateBinderSave } from "@/lib/binders";
describe("binder pages", () => {
  it("uses nine slots per 3 by 3 page", () => {
    const pages = binderPages(Array.from({ length: 12 }, (_, i) => i));
    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(pages[1]).toEqual([9, 10, 11, null, null, null, null, null, null]);
  });
  it("never permits publishing without confirmation", () => {
    expect(() =>
      validateBinderSave({ name: "Moon cards", isPublic: true, publishConfirmed: false }),
    ).toThrow("Confirm");
    expect(validateBinderSave({ name: "Moon cards", isPublic: true, publishConfirmed: true })).toBe(
      "Moon cards",
    );
  });
});
