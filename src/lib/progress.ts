/** Collector progress shown in Mori Studio: levels, Mori's wardrobe, badges and streaks. Pure and browser-safe. */

export const LEVELS = [
  { level: 1, name: "Newcomer", min: 0 },
  { level: 2, name: "Collector", min: 100 },
  { level: 3, name: "Curator", min: 200 },
  { level: 4, name: "Archivist", min: 400 },
  { level: 5, name: "Keeper", min: 800 },
  { level: 6, name: "Legend", min: 1600 },
] as const;

export type LevelInfo = {
  level: number;
  name: string;
  points: number;
  /** Points needed for the next level, or null at the top level. */
  next: number | null;
  nextName: string | null;
  /** 0–1 progress through the current level. */
  progress: number;
};

export function levelFor(points: number): LevelInfo {
  const p = Math.max(0, Math.floor(points));
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (p >= LEVELS[k]!.min) i = k;
  const cur = LEVELS[i]!;
  const nxt = LEVELS[i + 1];
  return {
    level: cur.level,
    name: cur.name,
    points: p,
    next: nxt ? nxt.min : null,
    nextName: nxt ? nxt.name : null,
    progress: nxt ? (p - cur.min) / (nxt.min - cur.min) : 1,
  };
}

/** Mori grows with the collector: one stage name per collector level. */
export const MORI_STAGES = [
  "Spark",
  "Glow",
  "Starlight",
  "Moonlit",
  "Celestial",
  "Aurora",
] as const;
export const moriStage = (level: number) =>
  MORI_STAGES[Math.min(MORI_STAGES.length, Math.max(1, level)) - 1]!;

/** Mori's wardrobe. Items unlock by collector level; there is no store. */
export const WARDROBE = [
  {
    id: "studio_scarf",
    name: "Studio scarf",
    unlock: 1,
    swatch: "linear-gradient(135deg,#5b7cc4,#8fa5de)",
  },
  {
    id: "ear_charms",
    name: "Ear charms",
    unlock: 2,
    swatch: "linear-gradient(135deg,#b48aa8,#e2c3d6)",
  },
  {
    id: "starlight_cape",
    name: "Starlight cape",
    unlock: 3,
    swatch: "linear-gradient(135deg,#6752df,#d98acc)",
  },
  {
    id: "moon_poncho",
    name: "Moon poncho",
    unlock: 4,
    swatch: "linear-gradient(135deg,#2c2f5a,#5a5f9a)",
  },
] as const;
export type OutfitId = (typeof WARDROBE)[number]["id"];

export const isOutfitId = (v: unknown): v is OutfitId =>
  typeof v === "string" && WARDROBE.some((w) => w.id === v);

/** Days in a row ending today (or yesterday, so a streak survives until the day's check-in). */
export function currentStreak(days: string[], today: string): number {
  const set = new Set(days);
  const d = new Date(`${today}T00:00:00Z`);
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export type BadgeStats = {
  cards: number;
  binders: number;
  memories: number;
  posts: number;
  moriPosts: number;
  streak: number;
};

export const BADGES: {
  id: string;
  name: string;
  hint: string;
  earned: (s: BadgeStats) => boolean;
}[] = [
  { id: "first_card", name: "First card", hint: "Add a card", earned: (s) => s.cards >= 1 },
  { id: "ten_cards", name: "Ten cards", hint: "Keep 10 cards", earned: (s) => s.cards >= 10 },
  { id: "binder", name: "Binder maker", hint: "Make a binder", earned: (s) => s.binders >= 1 },
  {
    id: "storyteller",
    name: "Storyteller",
    hint: "Save 3 memories",
    earned: (s) => s.memories >= 3,
  },
  { id: "first_post", name: "First post", hint: "Share a post", earned: (s) => s.posts >= 1 },
  {
    id: "made_with_mori",
    name: "Made with Mori",
    hint: "Create with Mori",
    earned: (s) => s.moriPosts >= 1,
  },
  { id: "streak3", name: "3-day streak", hint: "Check in 3 days", earned: (s) => s.streak >= 3 },
];
