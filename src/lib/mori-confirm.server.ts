/** Confirm or edit one of Mori's proposals. Shared by the server function and /api/mori-confirm. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { MoriRow, ProposalPayload } from "./mori-tools";
import { cardImage, getCard, getSet } from "./tcgdex";

export async function confirmWith(
  db: SupabaseClient<Database>,
  messageId: string,
  action: "confirm" | "edit",
  changes?: unknown,
) {
  const { data: msg, error } = await db
    .from("mori_messages")
    .select("payload")
    .eq("id", messageId)
    .eq("kind", "confirm")
    .single();
  if (error) throw error;
  const p = msg.payload as unknown as ProposalPayload;
  let details: Json | undefined;
  if (action === "confirm" && p.tool === "add_card_to_collection") {
    const card = await getCard(p.card.tcgdex_id);
    if (!card) throw new Error("Card not found");
    const set = await getSet(card.set.id);
    details = {
      tcgdex_id: card.id,
      name: card.name,
      set_name: card.set.name,
      set_id: card.set.id,
      number: card.localId,
      image_url: cardImage(card.image) ?? null,
      illustrator: card.illustrator ?? null,
      rarity: card.rarity ?? null,
      year: set?.releaseDate ? Number(set.releaseDate.slice(0, 4)) : null,
    };
  }
  if (action === "confirm" && p.tool === "set_order") details = orderChanges(changes);
  const result = await db.rpc("confirm_mori_proposal", {
    p_message_id: messageId,
    p_action: action,
    ...(details ? { p_card_details: details } : {}),
  });
  if (result.error) throw result.error;
  return result.data as unknown as { done: "confirmed" | "edited"; reply: MoriRow | null };
}

/** The collector's edits to an order card: buy or sell, a US$ price, and 7, 30 or 90 days. */
export function orderChanges(c: unknown): Json | undefined {
  if (!c || typeof c !== "object") return undefined;
  const o = c as Record<string, unknown>;
  const side = o["side"] === "buy" || o["side"] === "sell" ? o["side"] : undefined;
  const price = Number(o["price_usd"]);
  const days = Number(o["expires_days"]);
  const out: Record<string, Json> = {};
  if (side) out["side"] = side;
  if (Number.isFinite(price) && price > 0 && price <= 1_000_000)
    out["price_usd"] = Math.round(price * 100) / 100;
  if (days === 7 || days === 30 || days === 90) out["expires_days"] = days;
  return Object.keys(out).length ? out : undefined;
}
