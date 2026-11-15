import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
const cardId = z.string().trim().min(1).max(100);
export const writeSchemas = {
  add_card_to_collection: z.object({ card_id: cardId }),
  add_to_wishlist: z.object({ card_id: cardId, note: text.optional() }),
  create_binder: z.object({
    name: text,
    description: text.optional(),
    cards: z
      .array(z.object({ card_id: cardId, reason: text }))
      .min(1)
      .max(30),
  }),
  save_memory: z.object({
    title: text,
    story: text,
    place: text.optional(),
    with_whom: text.optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    card_id: cardId.optional(),
    photo_path: text.optional(),
  }),
};

export function validateWriteArgs(name: keyof typeof writeSchemas, args: unknown) {
  return writeSchemas[name].safeParse(args);
}

export function ownPhotoPath(path: string | undefined, userId: string) {
  return (
    !path ||
    (path.startsWith(`${userId}/`) &&
      path.length > userId.length + 1 &&
      !path.includes("..") &&
      !/[\\\u0000-\u001f]/.test(path))
  );
}

export function ownMessagePhotos(message: string, userId: string, photoPath?: unknown) {
  if (
    photoPath !== undefined &&
    (typeof photoPath !== "string" || !ownPhotoPath(photoPath, userId))
  )
    return false;
  const matches = [...message.matchAll(/photo_path\s*["']?\s*:\s*["']?([^\]\s"',}]+)/gi)];
  return matches.every((match) => ownPhotoPath(match[1], userId));
}
