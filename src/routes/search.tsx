import { createFileRoute } from "@tanstack/react-router";
import { Search as SearchIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cardImage, getCard, searchCards, type CardBrief, type CardDetail } from "@/lib/tcgdex";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · Bindory" },
      { name: "description", content: "Search every Pokémon TCG card by name." },
      { property: "og:title", content: "Search · Bindory" },
      { property: "og:description", content: "Search every Pokémon TCG card by name." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CardBrief[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState<CardDetail | null>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setState("idle"); return; }
    setState("loading");
    const t = setTimeout(() => {
      searchCards(q).then((r) => { setResults(r); setState("done"); }).catch(() => setState("error"));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AppShell title="Search">
      <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3">
        <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any card by name" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
      </label>
      {state === "loading" && <p className="mt-8 text-center text-muted-foreground">Searching…</p>}
      {state === "error" && <p className="mt-8 text-center text-destructive">Card search is not responding. Please try again.</p>}
      {state === "done" && results.length === 0 && <p className="mt-8 text-center text-muted-foreground">I could not find any cards matching “{q}”.</p>}
      {state === "done" && results.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {results.map((c) => (
            <button key={c.id} onClick={() => getCard(c.id).then(setOpen)} className="min-w-0 text-left">
              {c.image ? (
                <img src={cardImage(c.image, "low")} alt={c.name} loading="lazy" className="aspect-[63/88] w-full rounded-xl object-contain" />
              ) : (
                <div className="grid aspect-[63/88] w-full place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">No image</div>
              )}
              <p className="mt-1 truncate text-xs font-semibold">{c.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{c.id}</p>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-foreground/40 p-5" onClick={() => setOpen(null)}>
          <div className="w-full max-w-[350px] rounded-3xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{open.name}</p>
                <p className="text-sm text-muted-foreground">{open.set.name} · {open.localId}{open.set.cardCount?.official ? `/${open.set.cardCount.official}` : ""}</p>
              </div>
              <button aria-label="Close" onClick={() => setOpen(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border"><X className="h-4 w-4" /></button>
            </div>
            {open.image && <img src={cardImage(open.image)} alt={open.name} className="mx-auto mt-3 aspect-[63/88] w-56 object-contain" />}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {[open.rarity, open.illustrator && `Illustrated by ${open.illustrator}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
