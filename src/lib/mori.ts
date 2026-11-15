import { cards, memories } from "./data";

/** Mori only answers from the user's own data; it never invents facts. */
export function moriReply(q: string): string {
  const t = q.toLowerCase();
  if (/grade|grading|condition/.test(t)) return "From the photos, your Charizard looks like a likely 9. A grading service makes the final call.";
  const card = cards.find((c) => t.includes(c.name.toLowerCase()));
  if (card) return `You have ${card.name} (${card.set}, ${card.number}). You added it on ${card.addedOn}.`;
  if (/trip|travel|show|event/.test(t)) {
    const hits = memories.filter((m) => /trip|show/i.test(m.title + m.note));
    const place = t.match(/to ([a-z ]+)/)?.[1]?.trim();
    const found = place ? hits.filter((m) => (m.title + m.note).toLowerCase().includes(place)) : hits;
    if (!found.length) return "I could not find any trips like that in your memories.";
    return found.map((m) => `${m.title} on ${m.date}: ${m.note}`).join("\n");
  }
  if (/how many|count|collection/.test(t)) return `You have ${cards.length} cards in your collection.`;
  return "I could not find any matching cards or memories. Try asking about a card name or a trip.";
}
