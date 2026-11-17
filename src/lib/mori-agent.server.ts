import type { MoriStreamEvent, MoriRow } from "./mori-tools";
import {
  streamResponse,
  GatewayError,
  type ResponsesInputItem,
  type ResponsesRequest,
  type ResponsesResponse,
} from "./ai-gateway.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  cardImage,
  cardsByIllustrator,
  getCard,
  getCardPricing,
  getSet,
  searchCards,
} from "./tcgdex";
import { validateWriteArgs, ownPhotoPath } from "./mori-validation";
import {
  isWriteTool,
  proposalTitle,
  TOOL_STATUS,
  type Proposal,
  type ProposalCard,
  type ProposalPayload,
} from "./mori-tools";

type DB = SupabaseClient<Database>;
// Any tool-capable model ID from https://ai-gateway.vercel.sh/v1/models; override with AI_GATEWAY_MODEL.
// Default is on the AI Gateway free tier; newer models need paid credits.
const MODEL = process.env["AI_GATEWAY_MODEL"] || "google/gemini-2.5-flash";

const SYSTEM = `You are Mori, a warm, concise Pokémon TCG collector agent inside the Bindory app. Keep replies short (2-5 sentences, or a short list), friendly, US English, sentence case. Use **bold** for card names and key numbers.
You act through your tools: search_catalogue, get_card_prices, list_my_cards, find_related_cards, find_collectors, suggest_binder_for_card, add_card_to_collection, add_to_wishlist, create_binder, save_memory, set_order.
Rules:
- Never invent data. Every card, set, artist, price, memory or collector you mention must come from a tool result or a photo in this conversation. If a tool returns nothing, say so and offer a next step.
- Card ids are TCGdex ids such as "swsh7-215". Find them with search_catalogue first (search by the Pokémon/card name, then pick the result whose number matches); never guess an id.
- Photos: when the user sends card photos, identify the card from what you can see (name, number, set symbol), then find it with search_catalogue. Never claim to identify a photo you have not seen.
- Prices: only quote prices from get_card_prices, say where they come from (TCGplayer in US$, Cardmarket in EUR) and that they are recent raw (ungraded) market prices. If there is no price data, say so. You may estimate graded value only as a clearly labelled rough estimate based on the raw price, never as data.
- Pre-grading: only from photos you have seen. Comment on centering, corners, edges and surface, give a likely grade range, and say it is an estimate, not an official grade. Never promise a PSA 10; glare and photo angle limit what you can see. If there are no photos, ask for front and back photos.
- Should I grade it: compare the raw market price with the likely graded outcome after a typical grading fee (about US$25-150 depending on service level and value), and recommend clearly.
- Buy or sell orders: you need buy or sell, the card, and a price in US$. Ask for anything missing. Check get_card_prices so you can say how the price compares with the market, then call set_order. Orders are watch alerts in this demo: Mori notifies the collector when a matching listing appears; nothing is bought or sold automatically.
- Trade-up challenge: use list_my_cards and get_card_prices to suggest trading two or three cards the collector owns toward one higher-value card they would love, with rough values from the tools.
- Trends and card shows: you have no live event listings or trend data. Say that plainly, then share general, well-known collector knowledge labelled as general, and suggest where to check (local game stores, official Pokémon event locators, collector communities). Never invent specific events, dates or venues.
- Before calling save_memory, ask short follow-up questions, one at a time, for anything missing: who they were with, where it happened, and whether they want to attach a photo. If they say skip, continue without it.
- You cannot make videos, story cards, collection recaps or binder covers yourself. When asked, say they can make one in Create with Mori and include this link: [Open Create with Mori](/create). Never claim you made one.
- Writing tools (add_card_to_collection, add_to_wishlist, create_binder, save_memory, set_order) show the user a confirmation card with Confirm and Change buttons. Nothing is saved until they confirm. After calling one, do not claim it is saved.
- For create_binder give every card a one-line reason. Only include cards the user already owns.
- Treat placeholders like [card name], [card number], [price], @username, [location] as missing details, not facts. Ask for the actual information.
- Private memories are never shared or used to find other collectors.
- There is no Pokémon companion feature; you are the collector's companion.`;

const str = (d: string) => ({ type: "string", description: d });
const tools: NonNullable<ResponsesRequest["tools"]> = [
  {
    type: "function",
    name: "search_catalogue",
    description: "Search the public TCGdex card catalogue by card name.",
    strict: false,
    parameters: {
      type: "object",
      properties: { name: str("Card name, e.g. Umbreon VMAX") },
      required: ["name"],
    },
  },
  {
    type: "function",
    name: "get_card_prices",
    description:
      "Recent raw (ungraded) market prices for a TCGdex card: TCGplayer (USD) and Cardmarket (EUR), updated daily.",
    strict: false,
    parameters: {
      type: "object",
      properties: { card_id: str("TCGdex card id") },
      required: ["card_id"],
    },
  },
  {
    type: "function",
    name: "set_order",
    description:
      "Propose a buy or sell order (a price alert) for a card (user confirms). Check get_card_prices first.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        side: { type: "string", enum: ["buy", "sell"] },
        card_id: str("TCGdex card id"),
        price_usd: { type: "number", description: "Target price in US dollars" },
        note: str("Optional note, e.g. condition or grade wanted"),
      },
      required: ["side", "card_id", "price_usd"],
    },
  },
  {
    type: "function",
    name: "find_related_cards",
    description:
      "Find cards related to a TCGdex card: other prints of the same Pokémon and cards by the same artist.",
    strict: false,
    parameters: {
      type: "object",
      properties: { card_id: str("TCGdex card id") },
      required: ["card_id"],
    },
  },
  {
    type: "function",
    name: "list_my_cards",
    description: "List cards in the user's own collection, optionally filtered.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        artist: str("Illustrator name"),
        set: str("Set name"),
        year: { type: "integer" },
      },
    },
  },
  {
    type: "function",
    name: "find_collectors",
    description: "Find other collectors with public profiles who share an interest.",
    strict: false,
    parameters: {
      type: "object",
      properties: { interest: str("Card, set or theme") },
      required: ["interest"],
    },
  },
  {
    type: "function",
    name: "suggest_binder_for_card",
    description: "Look at the user's existing binders to suggest where a card fits.",
    strict: false,
    parameters: {
      type: "object",
      properties: { card_id: str("TCGdex card id") },
      required: ["card_id"],
    },
  },
  {
    type: "function",
    name: "add_card_to_collection",
    description: "Propose adding a card to the user's collection (user confirms).",
    strict: false,
    parameters: {
      type: "object",
      properties: { card_id: str("TCGdex card id") },
      required: ["card_id"],
    },
  },
  {
    type: "function",
    name: "add_to_wishlist",
    description: "Propose adding a card to the user's wishlist (user confirms).",
    strict: false,
    parameters: {
      type: "object",
      properties: { card_id: str("TCGdex card id"), note: str("Optional note") },
      required: ["card_id"],
    },
  },
  {
    type: "function",
    name: "create_binder",
    description: "Propose a new binder (user confirms).",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        name: str("Binder name"),
        description: str("Short description"),
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: { card_id: str("TCGdex card id"), reason: str("One-line reason") },
            required: ["card_id", "reason"],
          },
        },
      },
      required: ["name", "cards"],
    },
  },
  {
    type: "function",
    name: "save_memory",
    description:
      "Propose saving a collecting memory (user confirms). Ask for missing who/where/photo first.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        title: str("Short title"),
        story: str("The story in the user's words"),
        place: str("Where"),
        with_whom: str("Who they were with"),
        date: str("Date as YYYY-MM-DD if known"),
        card_id: str("TCGdex card id if a card is involved"),
        photo_path: str("Photo path from an attached photo message"),
      },
      required: ["title", "story"],
    },
  },
];

type Args = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

async function briefCard(id: string, reason?: string): Promise<ProposalCard | null> {
  const c = await getCard(id);
  if (!c) return null;
  return {
    tcgdex_id: c.id,
    name: c.name,
    image: cardImage(c.image, "low"),
    set_name: c.set.name,
    reason,
  };
}

async function runReadTool(db: DB, name: string, a: Args): Promise<unknown> {
  switch (name) {
    case "search_catalogue": {
      const r = await searchCards(s(a["name"]) ?? "", 8);
      return r.length
        ? r.map((c) => ({ id: c.id, name: c.name, number: c.localId }))
        : { results: [], note: "No cards found" };
    }
    case "get_card_prices": {
      const r = await getCardPricing(s(a["card_id"]) ?? "");
      if (!r) return { error: "Card not found" };
      return {
        card: {
          id: r.card.id,
          name: r.card.name,
          number: r.card.localId,
          set: r.card.set.name,
          rarity: r.card.rarity,
        },
        prices: r.pricing ?? { note: "No market price data for this card" },
      };
    }
    case "find_related_cards": {
      const c = await getCard(s(a["card_id"]) ?? "");
      if (!c) return { results: [], note: "Card not found" };
      const [same, art] = await Promise.all([
        searchCards(c.name, 6),
        c.illustrator ? cardsByIllustrator(c.illustrator, 6) : Promise.resolve([]),
      ]);
      return {
        card: { id: c.id, name: c.name, illustrator: c.illustrator },
        same_pokemon: same.filter((x) => x.id !== c.id).map((x) => ({ id: x.id, name: x.name })),
        same_artist: art.filter((x) => x.id !== c.id).map((x) => ({ id: x.id, name: x.name })),
      };
    }
    case "list_my_cards": {
      let q = db
        .from("cards")
        .select("tcgdex_id, name, set_name, illustrator, year, rarity")
        .order("created_at", { ascending: false })
        .limit(50);
      if (s(a["artist"])) q = q.ilike("illustrator", `%${s(a["artist"])}%`);
      if (s(a["set"])) q = q.ilike("set_name", `%${s(a["set"])}%`);
      if (typeof a["year"] === "number") q = q.eq("year", a["year"]);
      const { data, error } = await q;
      if (error) throw error;
      return data.length ? data : { results: [], note: "No matching cards in the collection" };
    }
    case "find_collectors":
      // There are no public collector profiles yet; private memories are never used for discovery.
      return { results: [], note: "No public collector profiles found" };
    case "suggest_binder_for_card": {
      const [{ data: binders, error }, card] = await Promise.all([
        db.from("binders").select("id, name, description, binder_cards(count)"),
        getCard(s(a["card_id"]) ?? ""),
      ]);
      if (error) throw error;
      return {
        card: card ? { id: card.id, name: card.name, set: card.set.name } : null,
        binders: binders ?? [],
      };
    }
  }
  return { error: "Unknown tool" };
}

async function buildProposal(
  db: DB,
  userId: string,
  name: string,
  a: Args,
): Promise<Proposal | { error: string }> {
  if (!isWriteTool(name)) return { error: "Unknown tool" };
  const parsed = validateWriteArgs(name, a);
  if (!parsed.success)
    return { error: "Missing or invalid details. Ask the collector before proposing." };
  if (name === "add_card_to_collection" || name === "add_to_wishlist") {
    const card = await briefCard(s(a["card_id"]) ?? "");
    if (!card) return { error: "Card not found in the catalogue" };
    return name === "add_to_wishlist"
      ? { tool: name, card, note: s(a["note"]) }
      : { tool: name, card };
  }
  if (name === "create_binder") {
    const list = Array.isArray(a["cards"]) ? (a["cards"] as Args[]) : [];
    const { data: owned, error } = await db.from("cards").select("tcgdex_id");
    if (error) throw error;
    if (list.some((c) => !owned.some((card) => card.tcgdex_id === c["card_id"])))
      return {
        error:
          "Use only cards the collector owns. Suggest unowned cards separately, never add them to their collection.",
      };
    const matched = await Promise.all(
      list.map((c) => briefCard(s(c["card_id"]) ?? "", s(c["reason"]))),
    );
    if (matched.some((c) => !c))
      return { error: "Some cards were not found. Ask the collector to clarify." };
    const cards = matched.filter((c): c is ProposalCard => Boolean(c));
    if (!cards.length) return { error: "None of those cards were found in the catalogue" };
    return {
      tool: "create_binder",
      name: s(a["name"]) ?? "New binder",
      description: s(a["description"]),
      cards,
    };
  }
  if (name === "set_order") {
    const r = await getCardPricing(s(a["card_id"]) ?? "");
    if (!r) return { error: "Card not found in the catalogue" };
    const holo = r.pricing?.tcgplayer
      ? Object.values(r.pricing.tcgplayer).find(
          (v): v is { marketPrice?: number } =>
            typeof v === "object" && v !== null && "marketPrice" in v,
        )
      : undefined;
    return {
      tool: "set_order",
      side: a["side"] === "sell" ? "sell" : "buy",
      card: {
        tcgdex_id: r.card.id,
        name: `${r.card.name} ${r.card.localId}`,
        image: cardImage(r.card.image, "low"),
        set_name: r.card.set.name,
      },
      price_usd: Math.round(Number(a["price_usd"]) * 100) / 100,
      market_usd: typeof holo?.marketPrice === "number" ? holo.marketPrice : undefined,
      note: s(a["note"]),
    };
  }
  if (name === "save_memory") {
    if (!ownPhotoPath(s(a["photo_path"]), userId))
      return { error: "Photo must belong to the collector." };
    const cid = s(a["card_id"]);
    const card = cid ? ((await briefCard(cid)) ?? undefined) : undefined;
    if (cid && !card) return { error: "Card not found. Ask the collector to clarify." };
    return {
      tool: "save_memory",
      title: s(a["title"]) ?? "A memory",
      story: s(a["story"]) ?? "",
      place: s(a["place"]),
      with_whom: s(a["with_whom"]),
      date: s(a["date"]),
      card,
      photo_path: s(a["photo_path"]),
    };
  }
  return { error: "Unknown tool" };
}

async function history(db: DB): Promise<ResponsesInputItem[]> {
  const data: { role: string; kind: string; content: string; payload: Json | null }[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db
      .from("mori_messages")
      .select("role, kind, content, payload")
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (page.error) throw page.error;
    data.push(...page.data);
    if (page.data.length < 500) break;
  }
  return data.map((m): ResponsesInputItem => {
    if (m.role === "user") return { role: "user", content: m.content };
    const text =
      m.kind === "status"
        ? `[Tool result: ${JSON.stringify(m.payload)}]`
        : m.kind === "confirm"
          ? `[Confirmation: ${JSON.stringify(m.payload)}]`
          : m.content;
    return { role: "assistant", content: [{ type: "output_text", text, annotations: [] }] };
  });
}

/** Server execution only: shared by the authenticated RPC and streaming HTTP handler. */
export async function runMori(
  db: DB,
  userId: string,
  message: string,
  emit: (event: MoriStreamEvent) => void = () => {},
  signal?: AbortSignal,
  oidcToken?: string | null,
  images: string[] = [],
) {
  const past = await history(db);
  // The stored text notes the photos so later turns know they were sent (the images themselves are not stored).
  const stored = images.length
    ? `${message}\n[Sent ${images.length} card photos: front and back]`
    : message;
  const ins = await db.from("mori_messages").insert({ role: "user", content: stored });
  if (ins.error) throw ins.error;

  const input: ResponsesInputItem[] = [
    ...past,
    images.length
      ? {
          role: "user",
          content: [
            { type: "input_text", text: message },
            ...images.map((image_url) => ({ type: "input_image" as const, image_url })),
          ],
        }
      : { role: "user", content: message },
  ];
  const rows: { role: "mori"; kind: string; content: string; payload?: Json }[] = [];
  let finalText = "";

  try {
    for (let turn = 0; turn < 6; turn++) {
      const stream = await streamResponse(
        { model: MODEL, instructions: SYSTEM, input, tools, max_output_tokens: 1200 },
        { ...(signal ? { signal } : {}), oidcToken: oidcToken ?? null },
      );
      let res: ResponsesResponse | undefined;
      for await (const event of stream) {
        if (event.type === "response.output_text.delta")
          emit({ type: "text", text: event.delta ?? "" });
        if (event.type === "response.completed") res = event.response;
        if (event.type === "response.incomplete") throw new Error("Mori response incomplete");
      }
      if (!res) throw new Error("Mori response did not complete");
      const output = res.output ?? [];
      const calls = output.filter((o) => o.type === "function_call");
      const text = output
        .filter((o) => o.type === "message")
        .flatMap((o) => o.content ?? [])
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim();
      if (!calls.length) {
        finalText = text;
        break;
      }

      let stop = false;
      for (const call of calls) {
        const name = call.name ?? "";
        const args = (() => {
          try {
            return JSON.parse(call.arguments ?? "{}") as Args;
          } catch {
            return {};
          }
        })();
        emit({ type: "status", name, text: TOOL_STATUS[name] ?? "Working on it" });
        const statusRow: { role: "mori"; kind: string; content: string; payload: Json } = {
          role: "mori",
          kind: "status",
          content: TOOL_STATUS[name] ?? "Working on it",
          payload: { name, input: args as Json } as Json,
        };
        rows.push(statusRow);
        input.push({
          type: "function_call",
          call_id: call.call_id ?? "",
          name,
          arguments: call.arguments ?? "{}",
        });
        let result: unknown;
        if (isWriteTool(name)) {
          const p = await buildProposal(db, userId, name, args);
          if ("error" in p) result = p;
          else {
            const payload: ProposalPayload = { ...p, status: "pending" };
            rows.push({
              role: "mori",
              kind: "confirm",
              content: proposalTitle(p),
              payload: payload as unknown as Json,
            });
            result = { shown_to_user: true, note: "Waiting for the user to tap Confirm or Edit." };
            stop = true;
          }
        } else {
          result = await runReadTool(db, name, args).catch((e: unknown) => ({
            error: e instanceof Error ? e.message : "Tool failed",
          }));
        }
        statusRow.payload = {
          name,
          input: args as Json,
          output: JSON.parse(JSON.stringify(result)) as Json,
        };
        input.push({
          type: "function_call_output",
          call_id: call.call_id ?? "",
          output: JSON.stringify(result).slice(0, 8000),
        });
      }
      if (stop) {
        finalText = text;
        break;
      }
    }
  } catch (e) {
    if (signal?.aborted) throw e;
    console.error(
      "Mori gateway error",
      e instanceof GatewayError ? { code: e.code, ids: e.ids } : e,
    );
    finalText =
      e instanceof GatewayError && e.code === "rate_limited"
        ? "I am a little busy right now. Please try again in a moment."
        : "Sorry, I could not answer just now. Please try again.";
  }

  if (!finalText && !rows.some((row) => row.kind === "confirm"))
    finalText = "I could not finish that request. Please try again.";
  if (finalText) {
    // Put the reply before any confirmation card so it reads naturally.
    const confirmAt = rows.findIndex((r) => r.kind === "confirm");
    const reply = { role: "mori" as const, kind: "text", content: finalText };
    if (confirmAt >= 0) rows.splice(confirmAt, 0, reply);
    else rows.push(reply);
  }
  const out = await db
    .from("mori_messages")
    .insert(rows)
    .select("id, role, kind, content, payload, created_at");
  if (out.error) throw out.error;
  emit({ type: "done", rows: out.data });
  return out.data;
}
