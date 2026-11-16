/**
 * Event banners. The Illustrator Week and Master Set banners are the prototype's original
 * artwork with their text built in. The anniversary banner uses original night-sky art with
 * text on top: the prototype's version drew Pokémon characters, which we don't put in a public demo.
 */
export const HOME_EVENTS = [
  {
    title: "Pokémon 30th Anniversary",
    label: "Featured this week",
    to: "/events/anniversary",
    theme: "bg-brand",
    image: "/demo/cover-celestial.jpg",
    textInImage: false,
  },
  {
    title: "Favourite Illustrator Week",
    label: "Community showcase",
    to: "/trending-binders",
    theme: "bg-showcase",
    image: "/demo/banner-illustrator-week.jpg",
    textInImage: true,
  },
  {
    title: "Complete a Master Set",
    label: "Collector challenge",
    to: "/create-binder",
    theme: "bg-challenge",
    image: "/demo/banner-master-set.jpg",
    textInImage: true,
  },
] as const;

export const MEMORY_QUESTIONS = [
  "Which card made you start collecting?",
  "Which card reminds you of a place or trip?",
  "Which card would you never sell, and why?",
] as const;

export function memoryQuestion(date: Date) {
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return (
    MEMORY_QUESTIONS[
      ((day % MEMORY_QUESTIONS.length) + MEMORY_QUESTIONS.length) % MEMORY_QUESTIONS.length
    ] ?? MEMORY_QUESTIONS[0]
  );
}

export function memoryPromptKey(date: Date, userId = "guest") {
  return `bindory-memory-prompt:${userId}:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function progressTo(owned: number, target: number) {
  const count = Math.min(Math.max(owned, 0), target);
  return {
    count,
    remaining: Math.max(0, target - count),
    percent: target > 0 ? (count / target) * 100 : 0,
  };
}
