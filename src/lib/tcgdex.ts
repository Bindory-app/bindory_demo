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
  const res = await fetch(
    `${BASE}/cards?name=${encodeURIComponent(q)}&pagination:itemsPerPage=${limit}`,
  );
  if (!res.ok) throw new Error(`TCGdex search failed (${res.status})`);
  const data = (await res.json()) as CardBrief[];
  return data.slice(0, limit);
}

/** Find cards by name, optionally narrowed by card number ("58" or "58/102") and set name, with each
 *  match's set so the right printing can be picked. */
export async function findCards(
  name: string,
  number?: string,
  set?: string,
  limit = 10,
): Promise<
  { id: string; name: string; number: string; set: string; set_size?: number | undefined }[]
> {
  const q = name.trim();
  if (!q) return [];
  const [num, total] = (number ?? "").split("/").map((x) => x.trim());
  const params = new URLSearchParams({ name: q, "pagination:itemsPerPage": "60" });
  if (num) params.set("localId", num.replace(/^0+(?=\d)/, ""));
  const res = await fetch(`${BASE}/cards?${params}`);
  if (!res.ok) throw new Error(`TCGdex search failed (${res.status})`);
  let list = (await res.json()) as CardBrief[];
  // A number search matches exactly (TCGdex also returns e.g. 58 for 5), with or without leading zeros.
  if (num)
    list = list.filter((c) => c.localId.replace(/^0+(?=\d)/, "") === num.replace(/^0+(?=\d)/, ""));
  // With a number the list is short: look up each card's set so "/102" or a set name can narrow it.
  if (!num && !set)
    return list
      .slice(0, limit)
      .map((c) => ({ id: c.id, name: c.name, number: c.localId, set: c.id.split("-")[0] ?? "" }));
  const detailed = await Promise.all(list.slice(0, 20).map((c) => getCard(c.id).catch(() => null)));
  let out = detailed
    .filter((c): c is CardDetail => Boolean(c))
    .map((c) => ({
      id: c.id,
      name: c.name,
      number: c.localId,
      set: c.set.name,
      set_size: c.set.cardCount?.official,
    }));
  if (total && out.some((c) => String(c.set_size) === total))
    out = out.filter((c) => String(c.set_size) === total);
  if (set && out.some((c) => c.set.toLowerCase().includes(set.toLowerCase())))
    out = out.filter((c) => c.set.toLowerCase().includes(set.toLowerCase()));
  return out.slice(0, limit);
}

export async function getCard(id: string): Promise<CardDetail | null> {
  const res = await fetch(`${BASE}/cards/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TCGdex card lookup failed (${res.status})`);
  return (await res.json()) as CardDetail;
}

export type CardPricing = {
  tcgplayer?: ({ unit?: string; updated?: string } & Record<string, unknown>) | undefined;
  cardmarket?: ({ unit?: string; updated?: string } & Record<string, unknown>) | undefined;
};

/** Daily market prices TCGdex publishes for a card (TCGplayer in USD, Cardmarket in EUR), if any. */
export async function getCardPricing(
  id: string,
): Promise<{ card: CardDetail; pricing: CardPricing | null } | null> {
  const c = (await getCard(id)) as (CardDetail & { pricing?: CardPricing | null }) | null;
  if (!c) return null;
  return { card: c, pricing: c.pricing ?? null };
}

/** One US$ price range for a raw (ungraded) card, from the daily market prices. Collectors see only
 *  the range, not which marketplaces it comes from. Null when there is no US$ market data. */
export function usdRange(
  pricing: CardPricing | null | undefined,
): { low: number; high: number; typical: number } | null {
  const variants = pricing?.tcgplayer
    ? Object.values(pricing.tcgplayer).filter(
        (v): v is { marketPrice?: number; midPrice?: number } =>
          typeof v === "object" && v !== null && ("marketPrice" in v || "midPrice" in v),
      )
    : [];
  const v = variants.find((x) => typeof x.marketPrice === "number") ?? variants[0];
  const market =
    typeof v?.marketPrice === "number" && v.marketPrice > 0 ? v.marketPrice : undefined;
  const mid = typeof v?.midPrice === "number" && v.midPrice > 0 ? v.midPrice : undefined;
  const typical = market ?? mid;
  if (!typical) return null;
  let low = Math.min(market ?? typical, mid ?? typical);
  let high = Math.max(market ?? typical, mid ?? typical);
  if (high - low < typical * 0.1) {
    low = typical * 0.92;
    high = typical * 1.08;
  }
  const round = (n: number) =>
    n >= 100 ? Math.round(n / 5) * 5 : n >= 10 ? Math.round(n) : Math.round(n * 100) / 100;
  return { low: round(low), high: round(high), typical: round(typical) };
}

/** A set with its card list (id, number, name). */
export async function getSetCards(
  id: string,
): Promise<{ id: string; name: string; cards: CardBrief[] } | null> {
  if (!id.trim()) return null;
  const res = await fetch(`${BASE}/sets/${encodeURIComponent(id.trim())}`);
  if (!res.ok) return null;
  const d = (await res.json()) as { id: string; name: string; cards?: CardBrief[] };
  return { id: d.id, name: d.name, cards: d.cards ?? [] };
}

export type SetDetail = { id: string; name: string; releaseDate?: string | undefined };

export async function getSet(id: string): Promise<SetDetail | null> {
  const res = await fetch(`${BASE}/sets/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return (await res.json()) as SetDetail;
}

/** Cards by the same illustrator (TCGdex filter). */
export async function cardsByIllustrator(name: string, limit = 8): Promise<CardBrief[]> {
  const res = await fetch(
    `${BASE}/cards?illustrator=${encodeURIComponent(name)}&pagination:itemsPerPage=${limit}`,
  );
  if (!res.ok) return [];
  return ((await res.json()) as CardBrief[]).slice(0, limit);
}
