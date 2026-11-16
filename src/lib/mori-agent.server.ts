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
import { cardImage, cardsByIllustrator, getCard, getSet, searchCards } from "./tcgdex";
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

const SYSTEM = `You are Mori, a warm, concise Pokémon TCG collector agent inside the Bindory app. Keep replies short (1-3 sentences), friendly, US English, sentence case.
You can only act through your tools: search_catalogue, add_card_to_collection, suggest_binder_for_card, create_binder, save_memory, add_to_wishlist, find_related_cards, list_my_cards, find_collectors.
Rules:
- Never invent data. Every card, set, artist, memory or collector you mention must come from a tool result in this conversation. If a tool returns nothing, say "I could not find any" and offer a next step.
- Before calling save_memory, ask short follow-up questions, one at a time, for anything missing: who they were with, where it happened, and whether they want to attach a photo (they can tap the camera button). If they say skip, continue without it.
- You cannot make videos, story cards, collection recaps or binder covers yourself. When asked, say they can make one in Create with Mori and include this link: [Open Create with Mori](/create). Never claim you made one.
- Card ids are TCGdex ids such as "swsh7-215". Find them with search_catalogue first; never guess an id.
- Writing tools (add_card_to_collection, create_binder, save_memory, add_to_wishlist) show the user a confirmation card with Confirm and Edit buttons. Nothing is saved until they confirm. After calling one, do not claim it is saved.
- For create_binder give every card a one-line reason. Only include cards the user already owns; never add suggested catalogue cards to their collection as a side effect.
- Treat placeholders like @username, [location], [date and time] as missing details, not facts. Ask for the actual information.
- Never claim to identify a photo you have not seen. A photo attachment is optional; ask for the card name if needed.
- Never discuss prices, values, buying or selling. If asked, say Bindory is about collecting and stories, not prices.
- If asked about grading, a likely 9 is the most you ever suggest, never a 10.
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
) {
  const past = await history(db);
  const ins = await db.from("mori_messages").insert({ role: "user", content: message });
  if (ins.error) throw ins.error;

  const input: ResponsesInputItem[] = [...past, { role: "user", content: message }];
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
