import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { ProposalPayload } from "./mori-tools";
import { getCard, getSet, cardImage } from "./tcgdex";
import type { MoriRow } from "./mori-tools";
export type { MoriStreamEvent, MoriRow } from "./mori-tools";

export const sendToMori = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => {
    const message = String(input.message ?? "")
      .trim()
      .slice(0, 2000);
    if (!message) throw new Error("Empty message");
    return { message };
  })
  .handler(async ({ data, context }) => {
    const { runMori } = await import("./mori-agent.server");
    return runMori(context.supabase, context.userId, data.message);
  });

export const confirmProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messageId: string; action: "confirm" | "edit" }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.messageId) || !["confirm", "edit"].includes(input.action))
      throw new Error("Invalid confirmation");
    return input;
  })
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: msg, error } = await db
      .from("mori_messages")
      .select("payload")
      .eq("id", data.messageId)
      .eq("kind", "confirm")
      .single();
    if (error) throw error;
    const p = msg.payload as unknown as ProposalPayload;
    let details: Json | undefined;
    if (data.action === "confirm" && p.tool === "add_card_to_collection") {
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
      p_message_id: data.messageId,
      p_action: data.action,
      ...(details ? { p_card_details: details } : {}),
    });
    if (result.error) throw result.error;
    return result.data as unknown as { done: "confirmed" | "edited"; reply: MoriRow | null };
  });

export const loadMoriHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows: MoriRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const page = await context.supabase
        .from("mori_messages")
        .select("id, role, kind, content, payload")
        .order("created_at")
        .order("id")
        .range(offset, offset + 499);
      if (page.error) throw page.error;
      rows.push(...page.data);
      if (page.data.length < 500) break;
    }
    return rows;
  });
