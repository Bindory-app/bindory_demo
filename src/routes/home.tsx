import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MessageCircle, Sparkles, Star, X } from "lucide-react";
import { AppShell, Panel, ThemeToggle } from "@/components/AppShell";
import { Mori } from "@/components/Mori";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { savePendingIntent } from "@/lib/pending-intent";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home · Bindory" },
      { name: "description", content: "Your Bindory home: points, events, set progress and ideas from Mori." },
      { property: "og:title", content: "Home · Bindory" },
      { property: "og:description", content: "Points, events, set progress and ideas from Mori." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

// Sample events until a real events source exists.
const EVENTS = [
  { title: "Local league night", when: "Every Friday", note: "Bring a deck and meet collectors" },
  { title: "Binder swap meetup", when: "First Sunday", note: "Show off your favourite pages" },
  { title: "New set prerelease", when: "Coming soon", note: "Open packs with friends" },
];

export const IDEAS = [
  { title: "Log my Japan trip", note: "Turn your trip into memories" },
  { title: "Group your moon themed cards", note: "Mori finds them for you" },
  { title: "Finish your next binder page", note: "See what is missing" },
  { title: "Make a story card", note: "Share the why behind a card" },
];

type SetProgress = { name: string; owned: number; total: number } | null;

function Home() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("collector");
  const [points, setPoints] = useState(0);
  const [set, setSet] = useState<SetProgress>(null);
  const [prompt, setPrompt] = useState(false);

  const askMori = (text?: string) => {
    if (text) savePendingIntent(text);
    void navigate({ to: "/" });
  };

  useEffect(() => {
    if (!session) return;
    const uid = session.user.id;
    void (async () => {
      const [{ data: p }, { data: pts }, { data: cs }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
        supabase.from("points_events").select("points"),
        supabase.from("cards").select("set_id, tcgdex_id"),
      ]);
      const meta = session.user.user_metadata as { full_name?: string; name?: string };
      const n = p?.display_name || meta.full_name || meta.name || session.user.email?.split("@")[0];
      if (n) setName(n.split(" ")[0]!);
      setPoints((pts ?? []).reduce((s, r) => s + r.points, 0));
      const counts = new Map<string, Set<string>>();
      for (const c of (cs ?? []) as { set_id: string | null; tcgdex_id: string | null }[]) {
        if (!c.set_id) continue;
        if (!counts.has(c.set_id)) counts.set(c.set_id, new Set());
        counts.get(c.set_id)!.add(c.tcgdex_id ?? Math.random().toString());
      }
      const top = [...counts.entries()].sort((a, b) => b[1].size - a[1].size)[0];
      if (top) {
        try {
          const r = await fetch(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(top[0])}`);
          const s = (await r.json()) as { name: string; cardCount?: { official?: number; total?: number } };
          const total = s.cardCount?.official ?? s.cardCount?.total ?? 0;
          if (total) setSet({ name: s.name, owned: Math.min(top[1].size, total), total });
        } catch (e) { console.error(e); }
      }
    })();
  }, [session]);

  // Today's memory prompt: once per day.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("bindory-memory-prompt") !== today) {
      localStorage.setItem("bindory-memory-prompt", today);
      const t = setTimeout(() => setPrompt(true), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  return (
    <AppShell
      title={`Hi, ${name}`}
      action={
        <div className="flex items-center gap-2">
          <Link to="/studio" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-sm font-bold text-primary-foreground">
            <Star className="h-4 w-4" /> {points} pts
          </Link>
          <ThemeToggle />
        </div>
      }
    >
      <button onClick={() => askMori()} className="flex w-full items-center gap-3 rounded-full border border-border bg-card px-4 py-3 text-left text-muted-foreground">
        <MessageCircle className="h-5 w-5 text-primary" /> Ask Mori anything
      </button>

      <h2 className="mb-3 mt-6 text-lg font-bold">Events</h2>
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {EVENTS.map((e) => (
          <Panel key={e.title} className="w-64 shrink-0 snap-start">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><CalendarDays className="h-4 w-4" />{e.when}</p>
            <p className="mt-1 font-bold">{e.title}</p>
            <p className="text-sm text-muted-foreground">{e.note}</p>
          </Panel>
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-lg font-bold">Keep your set going</h2>
      <Panel>
        {set ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate font-bold">{set.name}</p>
              <p className="shrink-0 text-sm font-semibold text-primary">{set.owned} / {set.total}</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(set.owned / set.total) * 100}%` }} />
            </div>
            <button onClick={() => askMori(`What am I missing from ${set.name}?`)} className="mt-3 text-sm font-bold text-primary">See what is missing</button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Add a card and Mori will track your progress toward its set.</p>
            <button onClick={() => askMori("Add a card")} className="mt-3 text-sm font-bold text-primary">Add a card</button>
          </>
        )}
      </Panel>

      <h2 className="mb-3 mt-6 text-lg font-bold">Ideas from Mori</h2>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
        {IDEAS.map((i) => (
          <button key={i.title} onClick={() => askMori(i.title)} className="w-56 shrink-0 snap-start rounded-3xl border border-border bg-card p-4 text-left">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="mt-2 font-bold">{i.title}</p>
            <p className="text-sm text-muted-foreground">{i.note}</p>
          </button>
        ))}
      </div>

      {prompt && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/30" onClick={() => setPrompt(false)}>
          <div className="relative w-full max-w-[390px] rounded-t-3xl bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Close" onClick={() => setPrompt(false)} className="absolute right-4 top-4 text-muted-foreground"><X className="h-5 w-5" /></button>
            <Mori className="mx-auto h-28 w-28" />
            <p className="mt-2 text-center text-xs font-semibold text-primary">Today's memory</p>
            <p className="mt-1 text-center text-lg font-bold">Which card made you smile this week?</p>
            <button onClick={() => askMori("Save a memory about a card that made me smile this week")} className="mt-4 w-full rounded-full bg-brand py-3 font-bold text-primary-foreground">Tell Mori</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
