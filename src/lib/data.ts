const img = (set: string, num: string) => `https://assets.tcgdex.net/en/${set}/${num}/high.png`;

export type Card = { id: string; name: string; set: string; number: string; image: string; addedOn: string };

export const cards: Card[] = [
  { id: "base1-4", name: "Charizard", set: "Base Set", number: "4/102", image: img("base/base1", "4"), addedOn: "Oct 2, 2026" },
  { id: "base1-2", name: "Blastoise", set: "Base Set", number: "2/102", image: img("base/base1", "2"), addedOn: "Sep 18, 2026" },
  { id: "base1-15", name: "Venusaur", set: "Base Set", number: "15/102", image: img("base/base1", "15"), addedOn: "Sep 3, 2026" },
  { id: "base1-58", name: "Pikachu", set: "Base Set", number: "58/102", image: img("base/base1", "58"), addedOn: "Aug 21, 2026" },
  { id: "base1-10", name: "Mewtwo", set: "Base Set", number: "10/102", image: img("base/base1", "10"), addedOn: "Aug 9, 2026" },
  { id: "base1-16", name: "Zapdos", set: "Base Set", number: "16/102", image: img("base/base1", "16"), addedOn: "Jul 30, 2026" },
];

export type Memory = { id: string; title: string; date: string; note: string; private: boolean };

export const memories: Memory[] = [
  { id: "m1", title: "Trip to the card show", date: "Oct 2, 2026", note: "Found Charizard at the community card show.", private: true },
  { id: "m2", title: "Trade night with friends", date: "Sep 18, 2026", note: "Traded duplicates and picked up Blastoise.", private: false },
];
