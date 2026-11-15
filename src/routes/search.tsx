import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · Bindory" },
      { name: "description", content: "Find collectors, public binders and artists on Bindory." },
      { property: "og:title", content: "Search · Bindory" },
      { property: "og:description", content: "Find collectors, public binders and artists on Bindory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

type PublicBinder = { id: string; name: string; description: string | null; cover: string | null; count: number };
// Collectors only appear once public collector profiles exist; we never invent them.
const collectors: { id: string; name: string; reason: string }[] = [];

function SearchPage() {
  const [q, setQ] = useState("");
  const [binders, setBinders] = useState<PublicBinder[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      supabase.rpc("list_public_binders", { p_query: q.trim() }).then(({ data, error }) => {
        if (error) { setError(true); return; }
        setError(false);
        setBinders((data as unknown as PublicBinder[]) ?? []);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AppShell title="Search">
      <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3">
        <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search collectors, binders or artists" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
      </label>

      <h2 className="mb-3 mt-6 text-lg font-bold">Collectors to explore</h2>
      {collectors.length === 0 ? (
        <Panel className="flex items-center gap-3 text-sm text-muted-foreground"><Users className="h-5 w-5 shrink-0" />I could not find any collectors to suggest yet.</Panel>
      ) : (
        <div className="space-y-2">{collectors.map((c) => (
          <Panel key={c.id}><p className="font-bold">{c.name}</p><p className="text-sm text-muted-foreground">{c.reason}</p></Panel>
        ))}</div>
      )}

      <h2 className="mb-3 mt-6 text-lg font-bold">Suggested binders</h2>
      {error && <p className="text-sm text-destructive">I could not load binders just now. Please try again.</p>}
      {!error && binders === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!error && binders?.length === 0 && <Panel className="text-sm text-muted-foreground">I could not find any public binders{q.trim() ? ` matching “${q.trim()}”` : ""}.</Panel>}
      {!error && !!binders?.length && (
        <div className="grid grid-cols-2 gap-3">{binders.map((b) => (
          <Link key={b.id} to="/b/$id" params={{ id: b.id }} className="min-w-0 rounded-3xl border border-border bg-card p-3">
            <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-muted">
              {b.cover ? <img src={b.cover} alt="" loading="lazy" className="h-full w-full object-contain p-1" /> : <span className="text-xs text-muted-foreground">No cover</span>}
            </div>
            <p className="mt-2 truncate text-sm font-bold">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.count} cards</p>
          </Link>
        ))}</div>
      )}
    </AppShell>
  );
}
