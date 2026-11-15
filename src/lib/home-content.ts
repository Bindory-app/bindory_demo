export const HOME_EVENTS = [
  { title: "Pokémon 30th Anniversary", label: "Featured this week", to: "/events/anniversary", theme: "bg-brand" },
  { title: "Favourite Illustrator Week", label: "Community showcase", to: "/trending-binders", theme: "bg-showcase" },
  { title: "Complete a Master Set", label: "Collector challenge", to: "/create-binder", theme: "bg-challenge" },
] as const;

export const MEMORY_QUESTIONS = [
  "Which card made you start collecting?",
  "Which card reminds you of a place or trip?",
  "Which card would you never sell, and why?",
] as const;

export function memoryQuestion(date: Date) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return MEMORY_QUESTIONS[((day % MEMORY_QUESTIONS.length) + MEMORY_QUESTIONS.length) % MEMORY_QUESTIONS.length] ?? MEMORY_QUESTIONS[0];
}

export function memoryPromptKey(date: Date, userId = "guest") {
  return `bindory-memory-prompt:${userId}:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function progressTo(owned: number, target: number) {
  const count = Math.min(Math.max(owned, 0), target);
  return { count, remaining: Math.max(0, target - count), percent: target > 0 ? count / target * 100 : 0 };
}