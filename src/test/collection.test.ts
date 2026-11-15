import { describe, expect, it } from "vitest";
import { claimCollectionNotice, collectionPage } from "@/lib/collection";

describe("Collection cards", () => {
  const cards = Array.from({ length: 25 }, (_, i) => ({
    name: `Card ${i + 1}`,
    set_name: i === 0 ? "151" : "Base Set",
    illustrator: i === 1 ? "Akira" : "Mitsuhiro",
  }));
  it("shows 12 cards per page with numbered pages", () => {
    expect(collectionPage(cards, "", 1).cards).toHaveLength(12);
    expect(collectionPage(cards, "", 2).cards[0]?.name).toBe("Card 13");
    expect(collectionPage(cards, "", 3)).toMatchObject({ pages: 3, page: 3, total: 25 });
    expect(collectionPage(cards, "", 3).cards).toHaveLength(1);
  });
  it("searches card names", () => {
    expect(collectionPage(cards, "Card 25", 1).cards.map((c) => c.name)).toEqual(["Card 25"]);
  });
  it("searches sets", () => {
    expect(collectionPage(cards, "151", 1).cards.map((c) => c.name)).toEqual(["Card 1"]);
  });
  it("searches artists without case sensitivity", () => {
    expect(collectionPage(cards, "akira", 1).cards.map((c) => c.name)).toEqual(["Card 2"]);
  });
  it("clamps the page after filtering", () => {
    expect(collectionPage(cards, "151", 3).page).toBe(1);
  });
});

describe("Mori noticed", () => {
  it("shows only once per collector in a session and again in a new session", () => {
    const makeStorage = () => {
      const rows = new Map<string, string>();
      return {
        getItem: (key: string) => rows.get(key) ?? null,
        setItem: (key: string, value: string) => {
          rows.set(key, value);
        },
      };
    };
    const storage = makeStorage();
    expect(claimCollectionNotice(storage, "collector")).toBe(true);
    expect(claimCollectionNotice(storage, "collector")).toBe(false);
    expect(claimCollectionNotice(storage, "another")).toBe(true);
    expect(claimCollectionNotice(makeStorage(), "collector")).toBe(true);
  });
});
