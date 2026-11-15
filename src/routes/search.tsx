import { createFileRoute } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cards } from "@/lib/data";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · Bindory" },
      { name: "description", content: "Search Pokémon TCG cards by name or set." },
      { property: "og:title", content: "Search · Bindory" },
      { property: "og:description", content: "Search Pokémon TCG cards by name or set." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const results = cards.filter((c) => (c.name + c.set).toLowerCase().includes(q.toLowerCase()));
  return (
    <AppShell title="Search">
      <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3">
        <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards or sets" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
      </label>
      {results.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">I could not find any cards matching “{q}”.</p>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {results.map((c) => (
            <div key={c.id} className="min-w-0">
              <img src={c.image} alt={c.name} loading="lazy" className="aspect-[63/88] w-full rounded-xl object-contain" />
              <p className="mt-1 truncate text-xs font-semibold">{c.name}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
