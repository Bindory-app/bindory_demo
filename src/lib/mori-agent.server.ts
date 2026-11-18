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
  findCards,
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
Every answer ends with a concrete next step the collector can take in the app, never a dead end.
- What to chase next: list_my_cards, pick the set or theme they collect most, get_set_cards for it, choose ONE specific card they are missing (prefer a notable one), get_card_prices for it, and in the same answer always call add_to_wishlist for that card (do not ask first; the collector confirms on the card). Your text: one or two sentences on why it fits, with today's price range.
- Trendy collections: call market_trends and name the 2-3 cards or sets rising fastest, with the change in % and today's price range. Say which of them the collector already owns (list_my_cards).
- Card shows: you cannot see live event listings. Say so in one line, suggest the official Pokemon event locator and local game stores, then in the same answer (call the tools before you write, never just promise to look) call list_my_cards and get_card_prices and name 2-3 of their cards worth bringing to trade or sell, with today's price range for each, plus one card to hunt for at the show that is NOT in list_my_cards (look it up with search_catalogue), and offer it as a wishlist card with add_to_wishlist.
- Refer to other collectors by name, never as he or she.
- Never suggest getting a card the collector already owns (check list_my_cards).
"This card", "it" or "that one" means the card most recently discussed in this chat (from photos, a pre-grade report, a price check or an order). Use that card; never ask which card when one was just discussed.
You act through your tools: search_catalogue, get_card_prices, pre_grade_report, my_price_movers, get_set_cards, list_my_cards, list_my_orders, market_trends, plan_video, show_collectors, find_related_cards, find_collectors, suggest_binder_for_card, add_card_to_collection, add_to_wishlist, create_binder, save_memory, set_order.
Rules:
- Be proactive. When a request is open-ended (build a binder, complete my set, what to chase next, collectors who share my taste, trade-ups, value changes), start with list_my_cards and the other tools and come back with a concrete suggestion. Do not hand the work back to the collector; ask at most one short question, after you have suggested something.
- Only list_my_cards says what the collector owns. Cards in earlier confirmation cards that were not confirmed are not in their collection.
- Never invent data. Every card, set, artist, price, memory or collector you mention must come from a tool result or a photo in this conversation. If a tool returns nothing, say so and offer a next step.
- Card ids are TCGdex ids such as "swsh7-215". Find them with search_catalogue first (search by the Pokémon/card name, then pick the result whose number matches); never guess an id. Never show ids to the collector; name cards by name and number (e.g. **Umbreon VMAX 215/203**).
- Photos: when the user sends card photos, read the card name and the collector number printed at the bottom left (e.g. 125/094), then search_catalogue by name and pick the result whose number matches. Never claim to identify a photo you have not seen.
- Prices: only quote prices from get_card_prices. Give one range in US$ (e.g. "**US$525 to US$615** raw, ungraded"); do not name marketplaces or data sources. If there is no price data, say so. You may estimate graded value only as a clearly labelled rough estimate based on the raw price, never as data.
- Pre-grading (only when the collector asks for a pre-grade or whether to grade; never for a plain price check): only from photos you have seen; if there are no photos, ask for front and back photos. Identify the card, call get_card_prices, then call pre_grade_report exactly once with: the three most likely whole PSA-scale grades (e.g. 10, 9, 8, or 9, 8, 7; no half grades) with probabilities that add up to 100 and a short visible reason each; subgrade scores (0-100) for centering, corners, edges and surface as PSA, CGC, BGS and TAG would see them; the overall grade each company would likely give; your confidence (0-100, lower when glare or angle hides detail); a short notes line (e.g. "60/40 back · light corner whitening"); and Mori's take: start with a clear verdict ("Worth sending." or "Sell it raw." or "Keep it raw."), then one short sentence why, weighing the likely grade against the raw price and a typical grading fee plus shipping (about US$25-150). Be realistic: a PSA 10 is rarely the most likely outcome from photos. After pre_grade_report, reply with one short sentence at most (it already shows the full report).
- Should I grade it (without new photos): compare the raw price range with the likely graded outcome after a typical grading fee, and recommend clearly.
- Buy or sell orders: you need buy or sell, the card, and a price in US$. Ask for anything missing. Check get_card_prices so you can say how the price compares with the market, then call set_order. Orders are watch alerts in this demo: Mori notifies the collector when a matching listing appears; nothing is bought or sold automatically. The collector can change buy/sell, the price and how long it stays open (7, 30 or 90 days) on the card before confirming. For their open orders, or to cancel one, call list_my_orders: the orders appear as cards with a Cancel button, so reply in one short line and never claim you cancelled an order yourself.
- Trade-up challenge: list_my_cards, then my_price_movers for their prices. Pick 2-3 cards to give that are NOT their most valuable card. Find one card they would love (search_catalogue, matching their favourite set, Pokemon or artist) and call get_card_prices for it. Its typical price must be 80-110% of the combined value of the cards they give; if not, change the cards you give until it is. Show the maths in one short list (each card and its price, then the total vs the target price), then in the same answer call add_to_wishlist for the target card.
- Value changes (what went up or down in my collection): call my_price_movers once. Report the biggest risers (and any big fallers) as percentages with today's price range, and say it compares the last 7 days with the last 30 days. Do not name marketplaces.
- Completing a set: use list_my_cards to find the set they own the most cards from, then get_set_cards for that set, and name a few of the cards they are missing (prefer notable ones).
- Collectors who share my taste: list_my_cards, then find_collectors, then call show_collectors with the 2-3 best matches and a one-line reason each, based on their bio and binders vs the collector's cards. They appear as profile cards the collector can open, so reply in one short line.
- Trends and card shows: you have no live event listings or trend data. Say that plainly, then share two or three general, well-known collector trends or tips, labelled as general knowledge, and suggest where to check (local game stores, official Pokémon event locators, collector communities). Never invent specific events, dates or venues.
- Memories: when the story already says who, where or when, call save_memory right away with a short title and what they told you. Ask one short question only if who and where are both missing. For a trade, look up both cards with search_catalogue (name and number) and pass card_id (the card they received) and traded_card_id (the card they gave). Never ask which exact card version; the cards are optional (attach it only if search_catalogue finds one clear match). Photos are optional too. Keep the story in their words, including the card numbers, how they felt and any ratings they gave (e.g. "Felt nostalgic and lucky. Trade 5/5, @minacollects 5/5."); never drop the feelings, they matter more than the facts.
- Videos: when asked to plan or make a video, call list_my_cards, choose a theme yourself, then call plan_video with a title and 3-5 of their cards in order, each with a short caption. It shows a storyboard the collector can post or save, so reply in one short line and do not repeat the scenes. You cannot render story cards, recaps or binder covers in chat yet; say so in one line and plan them in text.
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
    description:
      "Search the public TCGdex card catalogue. Always pass the card number when the collector gives one (e.g. 58/102), and the set name if known, so the exact printing is found.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        name: str("Card name only, e.g. Umbreon VMAX or Pikachu"),
        number: str("Card number as printed, e.g. 58/102 or 215"),
        set: str("Set name, e.g. Base Set or Evolving Skies"),
      },
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
    name: "show_collectors",
    description:
      "Show 2-3 collectors from find_collectors as profile cards, each with why they match.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              username: str("Username from find_collectors"),
              why: str("One short reason they match"),
            },
            required: ["username", "why"],
          },
        },
      },
      required: ["picks"],
    },
  },
  {
    type: "function",
    name: "plan_video",
    description:
      "Show a video storyboard from the collector's own cards (in order, with captions). They can post it to their profile or save it as a draft.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        title: str("Short video title"),
        scenes: {
          type: "array",
          description: "3-5 scenes, in order",
          items: {
            type: "object",
            properties: {
              card_id: str("TCGdex id of a card the collector owns"),
              caption: str("Short on-screen caption"),
            },
            required: ["card_id", "caption"],
          },
        },
      },
      required: ["title", "scenes"],
    },
  },
  {
    type: "function",
    name: "market_trends",
    description:
      "Price movement this week vs this month for popular chase cards across the market (real daily prices).",
    strict: false,
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "list_my_orders",
    description:
      "List the collector's own buy and sell orders (price alerts): card, side, price in US$, status and expiry.",
    strict: false,
    parameters: { type: "object", properties: {} },
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
    description:
      "Show the collector their binders so they can put a card they own into one (each binder gets an Add here button).",
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
      "Propose saving a collecting memory (user confirms). Who, where, date, card and photo are all optional.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        title: str("Short title"),
        story: str("The story in the user's words"),
        place: str("Where"),
        with_whom: str("Who they were with"),
        date: str("Date as YYYY-MM-DD if known"),
        card_id: str(
          "TCGdex id of the card the memory is about (in a trade: the card they received)",
        ),
        traded_card_id: str("In a trade: TCGdex id of the card they gave away"),
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
      const r = await findCards(s(a["name"]) ?? "", s(a["number"]), s(a["set"]));
      return r.length
        ? r
        : {
            results: [],
            note: "No cards found. Try the name alone, or check the number with the collector.",
          };
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
    case "list_my_orders": {
      // market_orders is created by setup/009 and is not in the generated types yet.
      const { data, error } = await (db as unknown as SupabaseClient)
        .from("market_orders")
        .select("id, side, card_name, image_url, price_usd, status, expires_at, created_at")
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data?.length ? data : { results: [], note: "No open orders" };
    }
    case "my_price_movers": {
      const { data, error } = await db
        .from("cards")
        .select("tcgdex_id, name, set_name")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      const ids = [...new Set(data.map((c) => c.tcgdex_id).filter(Boolean))];
      const moves = await priceMoves(ids);
      return moves.length
        ? {
            compared: "7-day average price vs 30-day average price",
            cards_checked: moves.length,
            moves,
          }
        : { results: [], note: "No price history for the cards in this collection" };
    }
    case "market_trends": {
      const moves = await priceMoves(TREND_CARDS);
      return moves.length
        ? { compared: "7-day average price vs 30-day average price", moves }
        : { results: [], note: "Market prices are unavailable right now. Try again shortly." };
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

const NEEDS_DATA =
  /card show|chase|trade-?up|trend|went up|went down|value|worth|price|complete .*set|share my taste|collectors|binder|video|orders?\b|my cards|my collection|add .* (?:to|into) my|wishlist/i;

// Popular chase cards (checked in TCGdex) whose prices show where collectors are heading.
const TREND_CARDS = [
  "sv08.5-161",
  "me02-125",
  "sv03.5-199",
  "swsh7-215",
  "swsh12-186",
  "sv08.5-156",
  "sv04.5-234",
  "sv08-238",
  "sv03.5-201",
  "swsh11-186",
  "me01-180",
  "sv09-184",
  "sv08.5-167",
];

/** 7-day vs 30-day average price change for these cards, biggest rise first. A few lookups at a
 *  time, retrying once, so a busy moment at TCGdex does not lose them all. */
async function priceMoves(ids: string[]) {
  // A few lookups at a time, retrying once, so a busy moment at TCGdex does not lose them all.
  const lookup = (id: string) =>
    getCardPricing(id).catch(() =>
      new Promise((r) => setTimeout(r, 400)).then(() => getCardPricing(id).catch(() => null)),
    );
  const priced: Awaited<ReturnType<typeof lookup>>[] = [];
  for (let i = 0; i < ids.length; i += 6)
    priced.push(...(await Promise.all(ids.slice(i, i + 6).map(lookup))));
  const rows = await Promise.all(
    priced.map(async (r) => {
      const cm = r?.pricing?.cardmarket as { avg7?: number; avg30?: number } | undefined;
      if (!r || !cm?.avg7 || !cm.avg30) return null;
      const range = usdRange(r.pricing);
      return {
        card: `${r.card.name} ${r.card.localId}`,
        set: r.card.set.name,
        change_pct: Math.round(((cm.avg7 - cm.avg30) / cm.avg30) * 1000) / 10,
        todays_price_range_usd: range ? `US$${range.low} to US$${range.high}` : undefined,
      };
    }),
  );
  const moves = rows.filter((x): x is NonNullable<typeof x> => x !== null);
  moves.sort((x, y) => y.change_pct - x.change_pct);
  return moves;
}

// "on 2 Nov 2026" in a memory template message, as YYYY-MM-DD.
const MONTH_NUM: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};
function templateDate(message: string): string | undefined {
  const m = /\bon (\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})\b/.exec(message);
  const mon = m?.[2] ? MONTH_NUM[m[2].toLowerCase()] : undefined;
  return m && mon ? `${m[3]}-${mon}-${(m[1] ?? "").padStart(2, "0")}` : undefined;
}
const TEMPLATE_END = " Help me save this memory.";

async function buildProposal(
  db: DB,
  userId: string,
  name: string,
  a: Args,
  message = "",
  seen: Set<string> = new Set(),
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
    // Cards are optional: keep only ones Mori actually looked up, so a guessed id never shows the wrong card.
    const cid = s(a["card_id"]);
    const tid = s(a["traded_card_id"]);
    const card = cid && seen.has(cid) ? ((await briefCard(cid)) ?? undefined) : undefined;
    const traded_card = tid && seen.has(tid) ? ((await briefCard(tid)) ?? undefined) : undefined;
    // From the fill-in template, the story is exactly what the collector wrote (facts, feelings, ratings).
    const fromTemplate = message.endsWith(TEMPLATE_END);
    const story = fromTemplate
      ? message.slice(0, -TEMPLATE_END.length).trim()
      : (s(a["story"]) ?? "");
    const date = s(a["date"]) ?? (fromTemplate ? templateDate(message) : undefined);
    return {
      tool: "save_memory",
      title: s(a["title"]) ?? "A memory",
      story,
      place: s(a["place"]),
      with_whom: s(a["with_whom"]),
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
      card,
      traded_card,
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
  mustUseTool = false,
) {
  for (let i = 0; ; i++) {
    try {
      return await streamResponse(
        {
          model: MODELS[i] ?? MODEL,
          instructions: SYSTEM,
          input,
          tools,
          ...(mustUseTool ? { tool_choice: "required" as const } : {}),
          max_output_tokens: 3000,
        },
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
  const ins = await db
    .from("mori_messages")
    .insert({ role: "user", content: stored })
    .select("created_at")
    .single();
  if (ins.error) throw ins.error;
  const askedAt = Date.parse(ins.data.created_at);

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
  let lastCard = "";
  // Card ids Mori has actually looked up in this chat, so it never proposes a card from a guessed id.
  const seenIds = new Set<string>(
    JSON.stringify(past).match(/[a-z0-9.]+-[a-z0-9]+(?=\\?")/gi) ?? [],
  );

  try {
    for (let turn = 0; turn < 6; turn++) {
      // Questions about the collector's own cards, prices or plans must look at real data first,
      // so the first step has to use a tool (the model sometimes answers from guesswork otherwise).
      const stream = await streamWithFallback(
        input,
        signal,
        oidcToken,
        turn === 0 && NEEDS_DATA.test(message),
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
        if (name === "pre_grade_report") {
          const report = gradeReport(args);
          if (!("error" in report) && !report.card && lastCard) report.card = lastCard;
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
        } else if (name === "show_collectors") {
          // Only real public profiles; Mori supplies the reason.
          const picks = (Array.isArray(args["picks"]) ? (args["picks"] as Args[]) : []).slice(0, 4);
          const { data } = await db.rpc("list_public_collectors", { p_query: "" });
          const all = (Array.isArray(data) ? data : []) as {
            display_name?: string;
            username?: string;
            avatar_url?: string;
          }[];
          const people = picks
            .map((x) => {
              const c = all.find((o) => o.username === (s(x["username"]) ?? "").replace(/^@/, ""));
              return c
                ? {
                    name: c.display_name ?? c.username,
                    username: c.username,
                    avatar: c.avatar_url ?? null,
                    why: (s(x["why"]) ?? "").slice(0, 140),
                  }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
          if (!people.length)
            result = { error: "Use usernames exactly as find_collectors returned them." };
          else {
            rows.push({
              role: "mori",
              kind: "people",
              content: `Collectors you may like: ${people.map((x) => x.name).join(", ")}`,
              payload: { people } as unknown as Json,
            });
            result = {
              shown_to_user: true,
              note: "The profile cards are on screen. Reply in one short line.",
            };
          }
        } else if (name === "plan_video") {
          // Storyboard from the collector's own cards; they post or save it with a button.
          const scenes = (Array.isArray(args["scenes"]) ? (args["scenes"] as Args[]) : []).slice(
            0,
            6,
          );
          const ids = scenes.map((x) => s(x["card_id"]) ?? "");
          const { data: owned } = await db
            .from("cards")
            .select("tcgdex_id, name, image_url")
            .in("tcgdex_id", ids.length ? ids : ["-"]);
          const frames = scenes
            .map((x) => {
              const c = (owned ?? []).find((o) => o.tcgdex_id === s(x["card_id"]));
              return c && c.image_url
                ? {
                    name: c.name,
                    image: c.image_url,
                    caption: (s(x["caption"]) ?? "").slice(0, 120),
                  }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
          if (frames.length < 2)
            result = { error: "Use 3-5 cards the collector owns (ids from list_my_cards)." };
          else {
            const title = (s(args["title"]) ?? "My collection").slice(0, 80);
            rows.push({
              role: "mori",
              kind: "video",
              content: `Video plan: ${title}`,
              payload: { title, frames } as unknown as Json,
            });
            result = {
              shown_to_user: true,
              note: "The storyboard is on screen with Post to profile and Save draft buttons. Reply in one short line.",
            };
          }
        } else if (name === "suggest_binder_for_card") {
          // The collector picks the binder with an Add here button; Mori only suggests one.
          result = await runReadTool(db, name, args).catch((e: unknown) => ({
            error: e instanceof Error ? e.message : "Tool failed",
          }));
          const r = result as {
            card?: { id: string; name: string } | null;
            binders?: { id: string; name: string; binder_cards?: { count: number }[] }[];
          };
          const owned = r.card
            ? await db.from("cards").select("id").eq("tcgdex_id", r.card.id).limit(1).maybeSingle()
            : null;
          if (!r.card) result = { error: "Card not found" };
          else if (!owned?.data)
            result = {
              note: "This card is not in the collection yet. Offer to add it to the collection first.",
            };
          else if (!r.binders?.length)
            result = {
              note: "The collector has no binders yet. Offer to build one with this card.",
            };
          else {
            rows.push({
              role: "mori",
              kind: "binders",
              content: `Pick a binder for ${r.card.name}`,
              payload: {
                card: { name: r.card.name, owned_card_id: owned.data.id },
                binders: r.binders.map((b) => ({
                  id: b.id,
                  name: b.name,
                  count: b.binder_cards?.[0]?.count ?? 0,
                })),
              } as unknown as Json,
            });
            result = {
              shown_to_user: true,
              binders: r.binders.map((b) => ({ name: b.name })),
              note: "The binders are on screen, each with an Add here button. In one or two short sentences, say which binder fits best and why. Never claim you added the card.",
            };
          }
        } else if (name === "list_my_orders") {
          // Open orders are shown as cards with a Cancel button; Mori only summarises them.
          result = await runReadTool(db, name, args).catch((e: unknown) => ({
            error: e instanceof Error ? e.message : "Tool failed",
          }));
          if (Array.isArray(result) && result.length) {
            rows.push({
              role: "mori",
              kind: "orders",
              content: `${result.length} open order${result.length > 1 ? "s" : ""}`,
              payload: { orders: result } as unknown as Json,
            });
            result = {
              shown_to_user: true,
              count: result.length,
              note: 'The open orders are on screen as cards, each with a Cancel button. Reply in one short, warm line such as "Here are your open orders. Tap Cancel on any you no longer want." Do not list them again.',
            };
          }
        } else if (
          (name === "add_to_wishlist" || name === "add_card_to_collection") &&
          !seenIds.has(s(args["card_id"]) ?? "")
        ) {
          result = {
            error:
              "Look this card up first with search_catalogue (name and number) and use the id it returns.",
          };
        } else if (isWriteTool(name)) {
          const p = await buildProposal(db, userId, name, args, message, seenIds);
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
        // The card this answer is about, so the report and follow-ups can name it.
        if (
          name === "get_card_prices" &&
          result &&
          typeof result === "object" &&
          "card" in result
        ) {
          const c = (result as { card: { name?: string; number?: string; set?: string } }).card;
          if (c.name)
            lastCard = `${c.name}${c.number ? ` ${c.number}` : ""}${c.set ? ` (${c.set})` : ""}`;
        }
        for (const m of JSON.stringify(result ?? null).matchAll(/"(?:id|tcgdex_id)":"([^"]+)"/g))
          if (m[1]) seenIds.add(m[1]);
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
  const tail = /(?:^|\n|(?<=[.?!])[ \t]+)[ \t*_]*suggestions?[ \t*_]*:(.*)$/is.exec(finalText);
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
      // "This card" is the card in the photos; Mori resolves it from the chat.
      "Price check this card",
    ];
  if (!suggestions.length)
    suggestions = [
      "Price check a card",
      "What card should I chase next?",
      "Start a trade-up challenge",
    ];
  suggestions = [...new Set(suggestions)].slice(0, 3);
  // A confirmation card is the next step itself; follow-ups come after Confirm instead.
  if (rows.some((r) => r.kind === "confirm")) suggestions = [];

  if (finalText) {
    // Put the reply before any confirmation card so it reads naturally.
    const confirmAt = rows.findIndex(
      (r) =>
        r.kind === "confirm" ||
        r.kind === "grade" ||
        r.kind === "orders" ||
        r.kind === "binders" ||
        r.kind === "video" ||
        r.kind === "people",
    );
    const reply = { role: "mori" as const, kind: "text", content: finalText };
    if (confirmAt >= 0) rows.splice(confirmAt, 0, reply);
    else rows.push(reply);
  }
  if (suggestions.length)
    rows.push({ role: "mori", kind: "suggest", content: "", payload: { suggestions } });
  // One insert gives every row the same time, and history is read back in time order, so give each
  // row its own millisecond (after the question) to keep the answer in order next time.
  const base = Math.max(Date.now(), Number.isFinite(askedAt) ? askedAt + 1 : 0);
  const out = await db
    .from("mori_messages")
    .insert(rows.map((r, i) => ({ ...r, created_at: new Date(base + i).toISOString() })))
    .select("id, role, kind, content, payload, created_at");
  if (out.error) throw out.error;
  emit({ type: "done", rows: out.data });
  return out.data;
}
