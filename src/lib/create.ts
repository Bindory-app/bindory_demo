/** Builders for Create with Mori. Pure: everything comes from the collector's own rows; nothing is invented. */
import type { Tables } from "@/integrations/supabase/types";
import { safeImage, type RecapBody, type StoryBody, type VideoBody } from "./posts";

type Card = Pick<
  Tables<"cards">,
  "name" | "image_url" | "set_name" | "illustrator" | "created_at" | "year" | "tcgdex_id"
>;
type Memory = Pick<
  Tables<"memories">,
  "title" | "note" | "place" | "happened_on" | "card_tcgdex_id"
>;

export function buildVideo(title: string, opening: string, cards: Card[]): VideoBody {
  const frames = [{ image: safeImage(opening), text: title.trim() || "A moment with my cards" }];
  for (const c of cards.slice(0, 5)) {
    const image = safeImage(c.image_url);
    if (image) frames.push({ image, text: c.name });
  }
  return { style: "Mori", frames: frames.filter((f) => f.image) };
}

export function buildStory(input: {
  title: string;
  text: string;
  memory?: Memory | undefined;
  cards: Card[];
}): StoryBody {
  const m = input.memory;
  const card = m?.card_tcgdex_id
    ? input.cards.find((c) => c.tcgdex_id === m.card_tcgdex_id)
    : undefined;
  const date = m?.happened_on
    ? new Date(`${m.happened_on}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
  return {
    title: input.title.trim(),
    text: input.text.trim(),
    image: safeImage(card?.image_url),
    place: m?.place ?? "",
    date,
  };
}

const top = (values: (string | null)[]) => {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = "";
  let n = 0;
  for (const [k, c] of counts) if (c > n) [best, n] = [k, c];
  return best;
};

export function buildRecap(cards: Card[], binders: number, memories: number, now: Date): RecapBody {
  const year = now.getUTCFullYear();
  const thisYear = cards.filter((c) => new Date(c.created_at).getUTCFullYear() === year).length;
  const stats = [
    { label: "cards in my collection", value: String(cards.length) },
    { label: `added in ${year}`, value: String(thisYear) },
    { label: binders === 1 ? "binder" : "binders", value: String(binders) },
    { label: memories === 1 ? "memory saved" : "memories saved", value: String(memories) },
  ];
  const set = top(cards.map((c) => c.set_name));
  const artist = top(cards.map((c) => c.illustrator));
  if (set) stats.push({ label: "favourite set", value: set });
  if (artist) stats.push({ label: "most collected artist", value: artist });
  return {
    title: `My ${year} in cards`,
    stats,
    images: cards
      .map((c) => safeImage(c.image_url))
      .filter(Boolean)
      .slice(0, 5),
  };
}
