export const COLLECTION_PAGE_SIZE = 12;
export const MOON_REQUEST = "Group your moon themed cards";

export function assignGrail<T extends { id: string; is_grail: boolean; grail_rank: number | null }>(
  cards: T[],
  cardId: string,
  rank: number,
): T[] {
  if (![1, 2, 3].includes(rank) || !cards.some((card) => card.id === cardId))
    throw new Error("Choose an owned card and grail 1, 2 or 3");
  return cards.map((card) =>
    card.id === cardId
      ? { ...card, is_grail: true, grail_rank: rank }
      : card.grail_rank === rank
        ? { ...card, is_grail: false, grail_rank: null }
        : card,
  );
}

export function collectionPage<
  T extends { name: string; set_name?: string | null; illustrator?: string | null },
>(cards: T[], query: string, requestedPage: number) {
  const words = query.trim().toLocaleLowerCase();
  const filtered = cards.filter((card) =>
    [card.name, card.set_name, card.illustrator].some((value) =>
      value?.toLocaleLowerCase().includes(words),
    ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / COLLECTION_PAGE_SIZE));
  const page = Math.max(1, Math.min(requestedPage, pages));
  return {
    cards: filtered.slice((page - 1) * COLLECTION_PAGE_SIZE, page * COLLECTION_PAGE_SIZE),
    pages,
    page,
    total: filtered.length,
  };
}

export function claimCollectionNotice(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
) {
  const key = `bindory-collection-noticed:${userId}`;
  if (storage.getItem(key)) return false;
  storage.setItem(key, "seen");
  return true;
}
