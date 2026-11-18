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
  getSetCards,
  searchCards,
  usdRange,
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

const SYSTEM = `You are Mori, a warm, concise Pokémon TCG collector agent inside the Bindory app. Keep replies short (2-5 sentences, or a short list), friendly, US English, sentence case. Use **bold** for card names and key numbers. Write money with thousands separators, e.g. US$2,211.14 or €1,810.68.
You act through your tools: search_catalogue, get_card_prices, pre_grade_report, my_price_movers, get_set_cards, list_my_cards, find_related_cards, find_collectors, suggest_binder_for_card, add_card_to_collection, add_to_wishlist, create_binder, save_memory, set_order.
Rules:
- Be proactive. When a request is open-ended (build a binder, complete my set, what to chase next, collectors who share my taste, trade-ups, value changes), start with list_my_cards and the other tools and come back with a concrete suggestion. Do not hand the work back to the collector; ask at most one short question, after you have suggested something.
- Only list_my_cards says what the collector owns. Cards in earlier confirmation cards that were not confirmed are not in their collection.
- Never invent data. Every card, set, artist, price, memory or collector you mention must come from a tool result or a photo in this conversation. If a tool returns nothing, say so and offer a next step.
- Card ids are TCGdex ids such as "swsh7-215". Find them with search_catalogue first (search by the Pokémon/card name, then pick the result whose number matches); never guess an id. Never show ids to the collector; name cards by name and number (e.g. **Umbreon VMAX 215/203**).
- Photos: when the user sends card photos, read the card name and the collector number printed at the bottom left (e.g. 125/094), then search_catalogue by name and pick the result whose number matches. Never claim to identify a photo you have not seen.
- Prices: only quote prices from get_card_prices. Give one range in US$ (e.g. "**US$525 to US$615** raw, ungraded"); do not name marketplaces or data sources. If there is no price data, say so. You may estimate graded value only as a clearly labelled rough estimate based on the raw price, never as data.
- Pre-grading (only when the collector asks for a pre-grade or whether to grade; never for a plain price check): only from photos you have seen; if there are no photos, ask for front and back photos. Identify the card, call get_card_prices, then call pre_grade_report exactly once with: the three most likely whole PSA-scale grades (e.g. 10, 9, 8, or 9, 8, 7; no half grades) with probabilities that add up to 100 and a short visible reason each; subgrade scores (0-100) for centering, corners, edges and surface as PSA, CGC, BGS and TAG would see them; the overall grade each company would likely give; your confidence (0-100, lower when glare or angle hides detail); a short notes line (e.g. "60/40 back · light corner whitening"); and Mori's take: start with a clear verdict ("Worth sending." or "Sell it raw." or "Keep it raw."), then one short sentence why, weighing the likely grade against the raw price and a typical grading fee plus shipping (about US$25-150). Be realistic: a PSA 10 is rarely the most likely outcome from photos. After pre_grade_report, reply with one short sentence at most (it already shows the full report).
- Should I grade it (without new photos): compare the raw price range with the likely graded outcome after a typical grading fee, and recommend clearly.
- Buy or sell orders: you need buy or sell, the card, and a price in US$. Ask for anything missing. Check get_card_prices so you can say how the price compares with the market, then call set_order. Orders are watch alerts in this demo: Mori notifies the collector when a matching listing appears; nothing is bought or sold automatically.
- Trade-up challenge: use list_my_cards and get_card_prices to suggest trading two or three cards the collector owns toward one card they would love whose value is close to the combined value of what they give (roughly 80-110%), with the values from the tools.
- Value changes (what went up or down in my collection): call my_price_movers once. Report the biggest risers (and any big fallers) as percentages with today's price range, and say it compares the last 7 days with the last 30 days. Do not name marketplaces.
- Completing a set: use list_my_cards to find the set they own the most cards from, then get_set_cards for that set, and name a few of the cards they are missing (prefer notable ones).
- Collectors who share my taste: use list_my_cards, then find_collectors, and explain the match using each collector's bio and binders.
- Trends and card shows: you have no live event listings or trend data. Say that plainly, then share two or three general, well-known collector trends or tips, labelled as general knowledge, and suggest where to check (local game stores, official Pokémon event locators, collector communities). Never invent specific events, dates or venues.
- Before calling save_memory, ask short follow-up questions, one at a time, for anything missing: who they were with, where it happened, and whether they want to attach a photo. If they say skip, continue without it.
- You cannot render videos, story cards, recaps or binder covers in chat yet. When asked, say so in one line, then plan it in the same reply, without asking whether they want a plan (never end with "Would you like me to..."): choose a theme yourself, pick 3-5 of their cards (from list_my_cards) to feature, in order, with a short caption for each, plus a title. Never claim you made the video, and do not include links.
- Writing tools (add_card_to_collection, add_to_wishlist, create_binder, save_memory, set_order) show the user a confirmation card with Confirm and Change buttons. Nothing is saved until they confirm. After calling one, do not claim it is saved.
- For create_binder give every card a one-line reason. Only include cards the user already owns.
- Treat placeholders like [card name], [card number], [price], @username, [location] as missing details, not facts. Ask for the actual information.
- Private memories are never shared or used to find other collectors.
- There is no Pokémon companion feature; you are the collector's companion.
- Always end your reply with one last line in exactly this form: Suggestions: <question 1> | <question 2> | <question 3>
  These are 2-3 short follow-ups the collector might tap next, written as the collector speaking (under 40 characters each), that you can actually help with. After a pre-grade report, include "Where can I send it for grading?" and "What does grading cost?".`;

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
      "Today's raw (ungraded) market price range in US$ for a TCGdex card, updated daily.",
    strict: false,
    parameters: {
      type: "object",
      properties: { card_id: str("TCGdex card id") },
      required: ["card_id"],
    },
  },
  {
    type: "function",
    name: "pre_grade_report",
    description:
      "Show the collector a pre-grade report from the card photos: Should I grade? (likely grades with probabilities), Mori's take, and a detailed subgrade report for PSA, CGC, BGS and TAG.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        card: str("Card name and number, e.g. Mega Charizard X ex 125/094"),
        outcomes: {
          type: "array",
          description: "The three most likely grades, probabilities adding up to 100",
          items: {
            type: "object",
            properties: {
              grade: { type: "number" },
              probability: { type: "number" },
              reason: str("Short visible reason, e.g. Centering is outside 55/45"),
            },
            required: ["grade", "probability", "reason"],
          },
        },
        take: str("Mori's take: one or two plain sentences, is it worth sending?"),
        confidence: { type: "number", description: "0-100" },
        subgrades: {
          type: "object",
          description: "Scores 0-100 per aspect, per grading company",
          properties: Object.fromEntries(
            ["centering", "corners", "edges", "surface"].map((k) => [
              k,
              {
                type: "object",
                properties: {
                  psa: { type: "number" },
                  cgc: { type: "number" },
                  bgs: { type: "number" },
                  tag: { type: "number" },
                },
              },
            ]),
          ),
        },
        overall: {
          type: "object",
          description: "Likely overall grade per company",
          properties: {
            psa: { type: "number" },
            cgc: { type: "number" },
            bgs: { type: "number" },
            tag: { type: "number" },
          },
        },
        notes: str("Short notes line, e.g. 60/40 back · light corner whitening"),
      },
      required: ["outcomes", "take", "confidence", "subgrades", "overall"],
    },
  },
  {
    type: "function",
    name: "my_price_movers",
    description:
      "For the collector's own cards: compare the 7-day average price with the 30-day average and return the biggest moves, plus today's price range. One call covers the whole collection.",
    strict: false,
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "get_set_cards",
    description:
      "List the cards in a TCGdex set (id, number, name), to see which cards a collector is missing.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        set_id: str("TCGdex set id, e.g. swsh7 (the part of a card id before the dash)"),
      },
      required: ["set_id"],
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
        raw_price_usd: usdRange(r.pricing) ?? { note: "No market price data for this card" },
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
    case "my_price_movers": {
      const { data, error } = await db
        .from("cards")
        .select("tcgdex_id, name, set_name")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      const ids = [...new Set(data.map((c) => c.tcgdex_id).filter(Boolean))];
      const rows = await Promise.all(
        ids.map(async (id) => {
          const r = await getCardPricing(id).catch(() => null);
          const cm = r?.pricing?.cardmarket as { avg7?: number; avg30?: number } | undefined;
          if (!r || !cm?.avg7 || !cm.avg30) return null;
          const range = usdRange(r.pricing);
          return {
            card: `${r.card.name} ${r.card.localId}`,
            set: r.card.set.name,
            change_pct: Math.round(((cm.avg7 - cm.avg30) / cm.avg30) * 1000) / 10,
            price_now_usd: range ? `US$${range.low} to US$${range.high}` : undefined,
          };
        }),
      );
      const moves = rows.filter((x): x is NonNullable<typeof x> => x !== null);
      moves.sort((x, y) => y.change_pct - x.change_pct);
      return moves.length
        ? {
            compared: "7-day average price vs 30-day average price",
            cards_checked: moves.length,
            moves,
          }
        : { results: [], note: "No price history for the cards in this collection" };
    }
    case "get_set_cards": {
      const set = await getSetCards(s(a["set_id"]) ?? "");
      if (!set) return { error: "Set not found" };
      return {
        set: { id: set.id, name: set.name, total: set.cards.length },
        cards: set.cards.slice(0, 300).map((c) => ({ id: c.id, number: c.localId, name: c.name })),
      };
    }
    case "find_collectors": {
      // Public profiles only (bio and public binder count); private memories are never used for discovery.
      const { data, error } = await db.rpc("list_public_collectors", { p_query: "" });
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as {
        display_name?: string;
        username?: string;
        bio?: string;
        binders?: number;
      }[];
      return list.length
        ? list.map((c) => ({
            name: c.display_name,
            username: c.username,
            bio: c.bio,
            public_binders: c.binders,
          }))
        : { results: [], note: "No public collector profiles found" };
    }
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
    const range = usdRange(r.pricing);
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
      market_usd: range?.typical,
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

/** Checks and tidies the model's pre-grade report before it is shown. */
function gradeReport(a: Args) {
  const num = (v: unknown, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined;
  };
  const outcomes = (Array.isArray(a["outcomes"]) ? (a["outcomes"] as Args[]) : [])
    .map((o) => ({
      grade: num(o["grade"], 1, 10),
      probability: num(o["probability"], 0, 100) ?? 0,
      reason: s(o["reason"])?.slice(0, 120) ?? "",
    }))
    .filter(
      (o): o is { grade: number; probability: number; reason: string } => o.grade !== undefined,
    )
    .slice(0, 4);
  const take = s(a["take"])?.slice(0, 400);
  if (outcomes.length < 2 || !take)
    return { error: "Give at least two likely grades and Mori's take." };
  const total = outcomes.reduce((n, o) => n + o.probability, 0) || 1;
  outcomes.forEach((o) => (o.probability = Math.round((o.probability / total) * 100)));
  outcomes.sort((x, y) => y.grade - x.grade);
  const companies = ["psa", "cgc", "bgs", "tag"] as const;
  const block = (v: unknown, lo: number, hi: number) =>
    Object.fromEntries(
      companies.map((c) => [
        c,
        num((v && typeof v === "object" ? (v as Args) : {})[c], lo, hi) ?? null,
      ]),
    );
  const subs = a["subgrades"] && typeof a["subgrades"] === "object" ? (a["subgrades"] as Args) : {};
  return {
    card: s(a["card"])?.slice(0, 120),
    outcomes,
    take,
    confidence: num(a["confidence"], 0, 100) ?? 70,
    // Some models answer subgrades on a 1-10 scale (BGS style); show everything as 0-100.
    subgrades: Object.fromEntries(
      ["centering", "corners", "edges", "surface"].map((k) => [
        k,
        Object.fromEntries(
          Object.entries(block(subs[k], 0, 100)).map(([c, v]) => [
            c,
            v !== null && v <= 10 ? v * 10 : v,
          ]),
        ),
      ]),
    ),
    overall: block(a["overall"], 1, 10),
    notes: s(a["notes"])?.slice(0, 160),
  };
}

/** The conversation so far: everything since `since` (when the collector opened Ask Mori or tapped
 *  New chat), so a new chat starts with a clean slate instead of every message ever sent. */
async function history(db: DB, since?: string): Promise<ResponsesInputItem[]> {
  const data: { role: string; kind: string; content: string; payload: Json | null }[] = [];
  for (let offset = 0; ; offset += 500) {
    let q = db.from("mori_messages").select("role, kind, content, payload");
    if (since) q = q.gt("created_at", since);
    const page = await q
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (page.error) throw page.error;
    data.push(...page.data);
    if (page.data.length < 500) break;
  }
  return data
    .filter((m) => m.kind !== "suggest")
    .map((m): ResponsesInputItem => {
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

// The AI Gateway free tier allows only a few requests per minute per model provider, and one Mori
// answer takes several requests (tool calls). When a model is rate limited, try the next one; each
// provider has its own limit. All of these are on the free tier and support tools and images.
const FALLBACK_MODELS = [
  "openai/gpt-4.1-mini",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5-mini",
];
const MODELS = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];

async function streamWithFallback(
  input: ResponsesInputItem[],
  signal: AbortSignal | undefined,
  oidcToken: string | null | undefined,
) {
  for (let i = 0; ; i++) {
    try {
      return await streamResponse(
        { model: MODELS[i] ?? MODEL, instructions: SYSTEM, input, tools, max_output_tokens: 3000 },
        { ...(signal ? { signal } : {}), oidcToken: oidcToken ?? null },
      );
    } catch (e) {
      if (!(e instanceof GatewayError && e.code === "rate_limited") || i >= MODELS.length - 1)
        throw e;
    }
  }
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
  since?: string,
) {
  const past = await history(db, since);
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
      const stream = await streamWithFallback(input, signal, oidcToken);
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
        if (name === "pre_grade_report") {
          const report = gradeReport(args);
          if ("error" in report) result = report;
          else {
            rows.push({
              role: "mori",
              kind: "grade",
              content: `Pre-grade${report.card ? ` for ${report.card}` : ""}: ${report.outcomes
                .map((o) => `${o.grade} (${o.probability}%)`)
                .join(", ")}. ${report.take}`,
              payload: report as unknown as Json,
            });
            result = { shown_to_user: true, note: "The report is on screen." };
            stop = true;
          }
        } else if (isWriteTool(name)) {
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

  if (!finalText && !rows.some((row) => row.kind === "confirm" || row.kind === "grade"))
    finalText = "I could not finish that request. Please try again.";
  // Pull out the follow-up questions Mori suggests (shown as buttons under the answer).
  let suggestions: string[] = [];
  const tail = /(?:^|\n)[ \t*_]*suggestions?[ \t*_]*:(.*)$/is.exec(finalText);
  if (tail) {
    suggestions = (tail[1] ?? "")
      .split(/\||\n/)
      .map((x) => x.replace(/^[\s"'*•\-\d.)]+|[\s"'*]+$/g, ""))
      .filter((x) => x.length > 2 && x.length <= 80);
    finalText = finalText.slice(0, tail.index).trim();
  }
  if (rows.some((r) => r.kind === "grade"))
    suggestions = [
      "Where can I send it for grading?",
      "What does grading cost?",
      ...suggestions,
      "Price check this card",
    ];
  if (!suggestions.length)
    suggestions = [
      "Price check a card",
      "What card should I chase next?",
      "Start a trade-up challenge",
    ];
  suggestions = [...new Set(suggestions)].slice(0, 3);

  if (finalText) {
    // Put the reply before any confirmation card so it reads naturally.
    const confirmAt = rows.findIndex((r) => r.kind === "confirm" || r.kind === "grade");
    const reply = { role: "mori" as const, kind: "text", content: finalText };
    if (confirmAt >= 0) rows.splice(confirmAt, 0, reply);
    else rows.push(reply);
  }
  rows.push({ role: "mori", kind: "suggest", content: "", payload: { suggestions } });
  const out = await db
    .from("mori_messages")
    .insert(rows)
    .select("id, role, kind, content, payload, created_at");
  if (out.error) throw out.error;
  emit({ type: "done", rows: out.data });
  return out.data;
}
