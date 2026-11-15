export type OnboardingKey = "reason" | "first_card" | "love";
export type OnboardingStep = { key: OnboardingKey; question: string; chips: string[]; reply: (answer: string) => string; cardSearch?: boolean };

export const ONBOARDING_GREETING = "Hi, I am Mori, your Bindory Agent. I help you keep your cards and the stories behind them.";

export const onboardingSteps: OnboardingStep[] = [
  {
    key: "reason",
    question: "First, what brings you to Bindory?",
    chips: ["Organise my cards", "Remember the stories", "Find collectors like me"],
    reply: (a) =>
      a === "Organise my cards" ? "Then I will help you keep every card in its place."
      : a === "Find collectors like me" ? "Then I will help you meet collectors who love what you love."
      : "Then I will help you keep the why behind every card.",
  },
  {
    key: "first_card",
    question: "Which card started it all for you?",
    chips: ["Charizard V", "Umbreon VMAX", "I am just starting"],
    cardSearch: true,
    reply: (a) => a === "I am just starting" ? "Welcome! Your first card will be a special one. I will remember it." : `${a}. A lovely place to start. I will remember it.`,
  },
  {
    key: "love",
    question: "Last one. What do you love collecting most?",
    chips: ["Full sets", "Beautiful artwork", "Cards with a story"],
    reply: () => "Got it. I will keep that in mind whenever I suggest cards and binders.",
  },
];

import { cardImage, searchCards as tcgSearch } from "./tcgdex";

export type CardMatch = { id: string; name: string; image?: string | undefined };

/** Card matches for the "first card" question, via the TCGdex service. */
export async function searchCards(name: string): Promise<CardMatch[]> {
  const found = await tcgSearch(name, 4);
  return found.map((c) => ({ id: c.id, name: c.name, image: cardImage(c.image, "low") }));
}
