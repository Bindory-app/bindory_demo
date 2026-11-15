import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { cards, type Card } from "@/lib/data";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "My collection · Bindory" },
      { name: "description", content: "Browse your Pokémon TCG binder in Bindory." },
      { property: "og:title", content: "My collection · Bindory" },
      { property: "og:description", content: "Browse your Pokémon TCG binder." },
    ],
  }),
  component: Collection,
});

function Collection() {
  const [sel, setSel] = useState<Card>(cards[0]!);
  return (
    <AppShell title="My collection">
      <Panel className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4">
        <img src={sel.image} alt={sel.name} className="aspect-[63/88] w-24 rounded-lg object-contain" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{sel.name}</p>
          <p className="text-sm text-muted-foreground">{sel.set} · {sel.number}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm font-bold text-primary-foreground">9</span>
            <span className="text-xs font-semibold text-accent-foreground">Likely grade</span>
          </div>
        </div>
      </Panel>
      <p className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">{cards.length} cards</p>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <button key={c.id} onClick={() => setSel(c)} className={`rounded-xl p-0.5 ${sel.id === c.id ? "ring-2 ring-primary" : ""}`}>
            <img src={c.image} alt={c.name} loading="lazy" className="aspect-[63/88] w-full rounded-lg object-contain" />
          </button>
        ))}
      </div>
    </AppShell>
  );
}
