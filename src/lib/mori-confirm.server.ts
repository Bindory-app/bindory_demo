/** Confirm or edit one of Mori's proposals. Shared by the server function and /api/mori-confirm. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { MoriRow, ProposalPayload } from "./mori-tools";
import { cardImage, getCard, getSet } from "./tcgdex";

export async function confirmWith(
  db: SupabaseClient<Database>,
  messageId: string,
  action: "confirm" | "edit",
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
  const result = await db.rpc("confirm_mori_proposal", {
    p_message_id: messageId,
    p_action: action,
    ...(details ? { p_card_details: details } : {}),
  });
  if (result.error) throw result.error;
  return result.data as unknown as { done: "confirmed" | "edited"; reply: MoriRow | null };
}
