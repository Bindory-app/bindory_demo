export type BinderCard = {
  id: string;
  name: string;
  image_url: string | null;
  reason: string | null;
  position: number;
};
export type BinderDetail = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_card_id: string | null;
  cards: BinderCard[];
};

export function binderPages<T>(cards: T[]): (T | null)[][] {
  return Array.from({ length: Math.max(1, Math.ceil(cards.length / 9)) }, (_, page) =>
    Array.from({ length: 9 }, (_, slot) => cards[page * 9 + slot] ?? null),
  );
}

export function validateBinderSave(input: {
  name: string;
  isPublic: boolean;
  publishConfirmed: boolean;
}) {
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error("Choose a binder name of up to 120 characters.");
  if (input.isPublic && !input.publishConfirmed)
    throw new Error("Confirm before making this binder public.");
  return name;
}
