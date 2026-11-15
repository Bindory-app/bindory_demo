/** Shared, browser-safe definitions for Mori's agent tools. */
export const WRITE_TOOLS = ["add_card_to_collection", "create_binder", "save_memory", "add_to_wishlist"] as const;
export type WriteTool = (typeof WRITE_TOOLS)[number];
export const isWriteTool = (n: string): n is WriteTool => (WRITE_TOOLS as readonly string[]).includes(n);

export const TOOL_STATUS: Record<string, string> = {
  search_catalogue: "Searching the card catalogue",
  find_related_cards: "Looking for related cards",
  list_my_cards: "Looking through your collection",
  find_collectors: "Looking for collectors",
  suggest_binder_for_card: "Checking your binders",
  add_card_to_collection: "Preparing the card",
  create_binder: "Designing a binder",
  save_memory: "Checking what is missing",
  add_to_wishlist: "Preparing your wishlist",
};

export const POINTS = { card_added: 10, memory_saved: 25 } as const;

export type ProposalCard = { tcgdex_id: string; name: string; image?: string | undefined; set_name?: string | undefined; reason?: string | undefined };
export type Proposal =
  | { tool: "add_card_to_collection"; card: ProposalCard }
  | { tool: "add_to_wishlist"; card: ProposalCard; note?: string | undefined }
  | { tool: "create_binder"; name: string; description?: string | undefined; cards: ProposalCard[] }
  | { tool: "save_memory"; title: string; story: string; place?: string | undefined; with_whom?: string | undefined; date?: string | undefined; card?: ProposalCard | undefined; photo_path?: string | undefined };

export type ProposalPayload = Proposal & { status: "pending" | "confirmed" | "edited" };

export function proposalTitle(p: Proposal): string {
  switch (p.tool) {
    case "add_card_to_collection": return `Add ${p.card.name} to your collection`;
    case "add_to_wishlist": return `Add ${p.card.name} to your wishlist`;
    case "create_binder": return `Create the binder “${p.name}”`;
    case "save_memory": return `Save the memory “${p.title}”`;
  }
}
