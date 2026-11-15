import { describe, expect, it } from "vitest";
import { BADGES, currentStreak, levelFor, moriStage, WARDROBE } from "@/lib/progress";
import { buildRecap, buildStory, buildVideo } from "@/lib/create";
import { postThumb, safeImage, videoBody } from "@/lib/posts";

const card = (over: Partial<Parameters<typeof buildVideo>[2][number]> = {}) => ({
  name: "Umbreon VMAX",
  image_url: "https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp",
  set_name: "Evolving Skies",
  illustrator: "KEIICHIRO ITO",
  created_at: "2026-03-01T00:00:00Z",
  year: 2021,
  tcgdex_id: "swsh7-215",
  ...over,
});

describe("levels", () => {
  it("maps points to levels and progress", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, name: "Newcomer", next: 100 });
    expect(levelFor(240)).toMatchObject({
      level: 3,
      name: "Curator",
      next: 400,
      nextName: "Archivist",
    });
    expect(levelFor(240).progress).toBeCloseTo(0.2);
    expect(levelFor(5000)).toMatchObject({ level: 6, next: null, progress: 1 });
    expect(levelFor(-5).points).toBe(0);
  });
  it("names Mori's stage and unlocks the Starlight cape at level 3", () => {
    expect(moriStage(3)).toBe("Starlight");
    expect(moriStage(99)).toBe("Aurora");
    expect(WARDROBE.find((w) => w.id === "starlight_cape")?.unlock).toBe(3);
  });
});

describe("streaks", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(currentStreak(["2026-11-15", "2026-11-14", "2026-11-13"], "2026-11-15")).toBe(3);
    expect(currentStreak(["2026-11-14", "2026-11-13"], "2026-11-15")).toBe(2);
    expect(currentStreak(["2026-11-12"], "2026-11-15")).toBe(0);
    expect(currentStreak([], "2026-11-15")).toBe(0);
  });
  it("earns badges from real counts only", () => {
    const none = { cards: 0, binders: 0, memories: 0, posts: 0, moriPosts: 0, streak: 0 };
    expect(BADGES.filter((b) => b.earned(none))).toHaveLength(0);
    const some = { ...none, cards: 12, memories: 3, streak: 3 };
    expect(BADGES.filter((b) => b.earned(some)).map((b) => b.id)).toEqual([
      "first_card",
      "ten_cards",
      "storyteller",
      "streak3",
    ]);
  });
});

describe("Create with Mori builders", () => {
  it("builds a video from the opening art and chosen cards, max five", () => {
    const v = buildVideo(
      "League night",
      "/demo/cover-moonlight.jpg",
      Array.from({ length: 7 }, () => card()),
    );
    expect(v.frames).toHaveLength(6);
    expect(v.frames[0]).toEqual({ image: "/demo/cover-moonlight.jpg", text: "League night" });
  });
  it("drops images from outside TCGdex or the demo art", () => {
    expect(safeImage("https://evil.example/x.png")).toBe("");
    const v = buildVideo("x", "https://evil.example/x.png", [
      card({ image_url: "javascript:alert(1)" }),
    ]);
    expect(v.frames).toHaveLength(0);
    expect(
      videoBody({ frames: [{ image: "https://evil.example/a.png", text: "a" }] }).frames,
    ).toHaveLength(0);
  });
  it("builds a story card from a memory and its card", () => {
    const s = buildStory({
      title: " League night ",
      text: "Best trade",
      memory: {
        title: "t",
        note: "n",
        place: "League night",
        happened_on: "2026-10-06",
        card_tcgdex_id: "swsh7-215",
      },
      cards: [card()],
    });
    expect(s).toMatchObject({ title: "League night", place: "League night", date: "October 2026" });
    expect(s.image).toContain("swsh7/215");
  });
  it("counts a recap from the collection without estimating", () => {
    const r = buildRecap(
      [card(), card({ created_at: "2025-01-01T00:00:00Z", set_name: "151" })],
      2,
      1,
      new Date("2026-11-15T00:00:00Z"),
    );
    expect(r.title).toBe("My 2026 in cards");
    expect(r.stats).toContainEqual({ label: "cards in my collection", value: "2" });
    expect(r.stats).toContainEqual({ label: "added in 2026", value: "1" });
    expect(r.stats).toContainEqual({ label: "memory saved", value: "1" });
    expect(r.stats).toContainEqual({ label: "most collected artist", value: "KEIICHIRO ITO" });
  });
  it("picks a grid thumbnail for each post kind", () => {
    expect(postThumb({ kind: "post", media_url: "/demo/cover-retro.jpg", body: {} })).toBe(
      "/demo/cover-retro.jpg",
    );
    expect(
      postThumb({
        kind: "video",
        media_url: null,
        body: { frames: [{ image: "/demo/a.jpg", text: "" }] },
      }),
    ).toBe("/demo/a.jpg");
  });
});
