import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import type { BinderDetail, BinderCard } from "./binders";
import { validateBinderSave } from "./binders";

function validId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new Error("Binder not found");
  return id;
}

export const loadOwnedBinder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: validId(data.id) }))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const binder = await db
      .from("binders")
      .select("id,name,description,is_public,cover_card_id")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (binder.error) throw new Error("I could not find this binder.");
    const [links, owned] = await Promise.all([
      db
        .from("binder_cards")
        .select("card_id,reason,position")
        .eq("binder_id", data.id)
        .eq("user_id", context.userId)
        .order("position"),
      db.from("cards").select("id,name,image_url").eq("user_id", context.userId).order("name"),
    ]);
    if (links.error || owned.error) throw new Error("I could not load your cards.");
    const cards: BinderCard[] = links.data.flatMap((link) => {
      const card = owned.data.find((c) => c.id === link.card_id);
      return card ? [{ ...card, reason: link.reason, position: link.position }] : [];
    });
    return { binder: { ...binder.data, cards } satisfies BinderDetail, owned: owned.data };
  });

export const saveOwnedBinder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name: string;
      description: string | null;
      cover: string | null;
      isPublic: boolean;
      publishConfirmed: boolean;
      cards: { id: string; reason: string | null }[];
    }) => {
      const name = validateBinderSave(input);
      if (input.cards.length > 500) throw new Error("Too many cards.");
      return {
        ...input,
        id: validId(input.id),
        name,
        cards: input.cards.map((c) => ({
          id: validId(c.id),
          reason: c.reason?.slice(0, 1000) ?? null,
        })),
      };
    },
  )
  .handler(async ({ data, context }) => {
    // Generated RPC types omit PostgreSQL's nullable arguments; send null for an empty cover.
    const { error } = await context.supabase.rpc("save_binder_detail", {
      p_id: data.id,
      p_name: data.name,
      p_description: data.description ?? "",
      p_cover: data.cover as string,
      p_public: data.isPublic,
      p_cards: data.cards as Json,
    });
    if (error) throw error;
    return { saved: true };
  });

export const createBinderPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { messageId: string; name: string; publish: boolean; publishConfirmed: boolean }) => ({
      ...input,
      messageId: validId(input.messageId),
      name: validateBinderSave({
        name: input.name,
        isPublic: input.publish,
        publishConfirmed: input.publishConfirmed,
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("confirm_binder_preview", {
      p_message: data.messageId,
      p_name: data.name,
      p_publish: data.publish,
    });
    if (result.error) throw result.error;
    return result.data as unknown as { binder_id: string };
  });

export const loadPublicBinder = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => ({ id: validId(data.id) }))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) throw new Error("Public binders are unavailable just now.");
    const db = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const result = await db.rpc("read_public_binder", { p_id: data.id });
    if (result.error) throw new Error("I could not load this binder.");
    return result.data as unknown as BinderDetail | null;
  });
