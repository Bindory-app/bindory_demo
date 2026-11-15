export const COLLECTION_PAGE_SIZE = 12;
export const MOON_REQUEST = "Group your moon themed cards";

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
