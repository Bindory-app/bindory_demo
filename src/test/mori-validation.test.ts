import { describe, expect, it } from "vitest";
import { validateWriteArgs, ownPhotoPath } from "@/lib/mori-validation";

describe("Mori writing tools", () => {
  it("requires a one-line reason for every binder card", () => {
    expect(
      validateWriteArgs("create_binder", {
        name: "Moon moments",
        cards: [{ card_id: "swsh7-215" }],
      }).success,
    ).toBe(false);
    expect(
      validateWriteArgs("create_binder", {
        name: "Moon moments",
        cards: [{ card_id: "swsh7-215", reason: "Moonlit artwork" }],
      }).success,
    ).toBe(true);
  });
  it("requires both a memory title and story before proposing a save", () => {
    expect(validateWriteArgs("save_memory", { title: "My first card" }).success).toBe(false);
    expect(
      validateWriteArgs("save_memory", { title: "My first card", story: "A gift from my friend" })
        .success,
    ).toBe(true);
  });
  it("rejects another collector's private photo", () => {
    expect(ownPhotoPath("other/photo.jpg", "collector")).toBe(false);
    expect(ownPhotoPath("collector/photo.jpg", "collector")).toBe(true);
  });
});
