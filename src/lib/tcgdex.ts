/** Public TCGdex card service. Images are hotlinked from TCGdex and never stored. */
const BASE = "https://api.tcgdex.net/v2/en";

export type CardBrief = { id: string; localId: string; name: string; image?: string | undefined };
export type CardDetail = CardBrief & {
  rarity?: string | undefined;
  hp?: number | undefined;
  types?: string[] | undefined;
  illustrator?: string | undefined;
  set: { id: string; name: string; cardCount?: { official?: number } };
};

/** TCGdex gives a base image path; append quality + format. */
export const cardImage = (image: string | undefined, quality: "high" | "low" = "high") =>
  image ? `${image}/${quality}.webp` : undefined;

export async function searchCards(name: string, limit = 24): Promise<CardBrief[]> {
  const q = name.trim();
  if (!q) return [];
  const res = await fetch(`${BASE}/cards?name=${encodeURIComponent(q)}&pagination:itemsPerPage=${limit}`);
  if (!res.ok) throw new Error(`TCGdex search failed (${res.status})`);
  const data = (await res.json()) as CardBrief[];
  return data.slice(0, limit);
}

export async function getCard(id: string): Promise<CardDetail | null> {
  const res = await fetch(`${BASE}/cards/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TCGdex card lookup failed (${res.status})`);
  return (await res.json()) as CardDetail;
}
