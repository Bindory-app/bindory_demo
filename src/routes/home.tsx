import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { Mori } from "@/components/Mori";
import { cards, memories } from "@/lib/data";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home · Bindory" },
      { name: "description", content: "See your latest Pokémon TCG cards and chat with Mori, your collector companion." },
      { property: "og:title", content: "Home · Bindory" },
      { property: "og:description", content: "Your latest cards and Mori, your collector companion." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell title="Hi, collector">
      <div className="relative overflow-hidden rounded-3xl bg-brand p-5 text-primary-foreground">
        <div className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold opacity-90">Mori says</p>
            <p className="mt-1 text-lg font-bold leading-snug">You added {cards.length} cards this season. Want to look back?</p>
            <Link to="/mori" className="mt-4 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-primary">
              <MessageCircle className="h-4 w-4" /> Ask Mori
            </Link>
          </div>
          <Mori className="h-32 w-28" />
        </div>
      </div>

      <h2 className="mb-3 mt-6 text-lg font-bold">Recently added</h2>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
        {cards.slice(0, 4).map((c) => (
          <div key={c.id} className="w-28 shrink-0">
            <img src={c.image} alt={c.name} loading="lazy" className="aspect-[63/88] w-full rounded-xl border border-border object-contain" />
            <p className="mt-1 truncate text-sm font-semibold">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.addedOn}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-lg font-bold">Your memories</h2>
      <div className="space-y-3">
        {memories.map((m) => (
          <Panel key={m.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-bold">{m.title}</p>
              <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{m.private ? "Private" : "Shared"}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{m.date} · {m.note}</p>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
