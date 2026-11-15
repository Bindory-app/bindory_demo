import { describe, expect, it } from "vitest";
import {
  canAcceptMessage,
  greetingFor,
  mergeDoneMessages,
  shouldRefocusAfterReply,
} from "@/lib/mori-chat-state";

describe("Mori chat safeguards", () => {
  it("does not duplicate the optimistic user when done includes the saved user", () => {
    expect(
      mergeDoneMessages(
        [{ from: "me", text: "Add a card" }],
        [
          { id: "user-1", from: "me", text: "Add a card" },
          { id: "reply-1", from: "mori", text: "Which card?" },
        ],
      ),
    ).toEqual([
      { from: "me", text: "Add a card" },
      { id: "reply-1", from: "mori", text: "Which card?" },
    ]);
  });
  it("does not append saved reply IDs twice", () => {
    expect(
      mergeDoneMessages([{ id: "reply-1", from: "mori" }], [{ id: "reply-1", from: "mori" }]),
    ).toHaveLength(1);
  });
  it("does not accept new onboarding messages during card search", () => {
    expect(canAcceptMessage("onboarding", false, true)).toBe(false);
    expect(canAcceptMessage("onboarding", false, false)).toBe(true);
  });
  it("blocks messages when the profile cannot load", () => {
    expect(canAcceptMessage("profile-error", false, false)).toBe(false);
  });
  it("does not refocus the composer on touch devices", () => {
    expect(shouldRefocusAfterReply(1, false)).toBe(false);
    expect(shouldRefocusAfterReply(0, true)).toBe(false);
    expect(shouldRefocusAfterReply(0, false)).toBe(true);
  });
  it("greets an unnamed collector without an invented name", () => {
    expect(greetingFor("")).toBe("Hi, what shall we do today?");
    expect(greetingFor("   ")).toBe("Hi, what shall we do today?");
    expect(greetingFor("Wing Wu")).toBe("Hi Wing, what shall we do today?");
  });
});
