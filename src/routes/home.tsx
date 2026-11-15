import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, Star } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { AppShell } from "@/components/AppShell";
import { HomeEvents } from "@/components/HomeEvents";
import { HomeProgress } from "@/components/HomeProgress";
import { Button } from "@/components/ui/button";
import { Mori } from "@/components/Mori";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { savePendingIntent } from "@/lib/pending-intent";
import { memoryPromptKey, memoryQuestion } from "@/lib/home-content";
import { cardImage, getCard } from "@/lib/tcgdex";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [
    { title: "Home · Bindory" },
    { name: "description", content: "Your Bindory home: points, events, collection progress and ideas from Mori." },
    { property: "og:title", content: "Home · Bindory" },
    { property: "og:description", content: "Points, events, collection progress and ideas from Mori." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Home,
});

export const IDEAS = [
  { title: "Log my Japan trip", kicker: "A place to remember", cardId: "neo3-9" },
  { title: "Group your moon themed cards", kicker: "A theme you love", cardId: "swsh7-215" },
  { title: "Finish your next binder page", kicker: "Finish a page", cardId: "neo1-9" },
  { title: "Make a story card", kicker: "A story to keep", cardId: "sv03.5-151" },
];
const carousel = "-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2";
type OwnedCard = { id: string; tcgdex_id: string; set_id: string | null; image_url: string | null };

function Home() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("collector");
  const [points, setPoints] = useState(0);
  const [artworks, setArtworks] = useState<OwnedCard[]>([]);
  const [journey, setJourney] = useState<OwnedCard[]>([]);
  const [prompt, setPrompt] = useState(false);
  const [question, setQuestion] = useState("");
  const [ideaImages, setIdeaImages] = useState<Record<string, string>>({});
  const [greeting, setGreeting] = useState("Good evening");
  const askMori = (text?: string) => { if (text) savePendingIntent(text); void navigate({ to: "/" }); };

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    let active = true;
    void Promise.all(IDEAS.map(async idea => {
      const card = await getCard(idea.cardId).catch(() => null);
      return [idea.cardId, cardImage(card?.image)] as const;
    })).then(rows => { if (active) setIdeaImages(Object.fromEntries(rows.filter((row): row is readonly [string, string] => Boolean(row[1])))); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) { setName("collector"); setPoints(0); setArtworks([]); setJourney([]); return; }
    let cancelled = false;
    const uid = session.user.id;
    void (async () => {
      const [profile, pointRows, cardRows, binderRows] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
        supabase.from("points_events").select("points").eq("user_id", uid),
        supabase.from("cards").select("id, tcgdex_id, set_id, image_url").eq("user_id", uid),
        supabase.from("binders").select("id, name").eq("user_id", uid),
      ]);
      if (cancelled) return;
      const meta = session.user.user_metadata as { full_name?: string; name?: string };
      const displayName = profile.data?.display_name || meta.full_name || meta.name || session.user.email?.split("@")[0];
      setName(displayName?.split(" ")[0] || "collector");
      setPoints((pointRows.data ?? []).reduce((sum, row) => sum + row.points, 0));
      const cards = cardRows.data ?? [];
      setJourney([...new Map(cards.filter(card => card.set_id === "sv03.5").map(card => [card.tcgdex_id, card])).values()]);
      const artworkBinder = binderRows.data?.find(binder => binder.name.toLowerCase() === "favourite artworks");
      if (!artworkBinder) { setArtworks([]); return; }
      const { data: links } = await supabase.from("binder_cards").select("card_id").eq("binder_id", artworkBinder.id).eq("user_id", uid);
      if (!cancelled) setArtworks(cards.filter(card => links?.some(link => link.card_id === card.id)));
    })();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!ready) return;
    const now = new Date();
    setQuestion(memoryQuestion(now));
    const key = memoryPromptKey(now, session?.user.id);
    let seen = false;
    try { seen = localStorage.getItem(key) === "seen"; } catch { /* still offer the prompt */ }
    if (seen) { setPrompt(false); return; }
    const timer = setTimeout(() => {
      try { localStorage.setItem(key, "seen"); } catch { /* storage may be unavailable */ }
      setPrompt(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [ready, session?.user.id]);

  return <AppShell home title="Home" greeting={`${greeting}, ${name}`} action={<Button asChild aria-label={`${points} points, open Mori Studio`} variant="secondary" className="h-11 rounded-2xl px-3 text-lg font-bold text-primary shadow-none"><Link to="/studio"><Star />{points}</Link></Button>}>
    <Button variant="outline" onClick={() => askMori()} className="h-14 w-full justify-start gap-3 rounded-full border-2 bg-secondary/60 px-2 text-base font-bold text-muted-foreground shadow-none"><Mori className="h-10 w-10 shrink-0" />Ask Mori anything<Mic className="ml-auto mr-3 text-primary" /></Button>
    <HomeEvents />
    <h2 className="mb-2 mt-4 text-lg font-bold">Keep your set going</h2>
    <div className={carousel}>
      <HomeProgress name="Favourite artworks" owned={artworks.length} target={20} onClick={() => askMori("Help me keep my Favourite artworks binder going toward 20 cards")} />
      <HomeProgress name="151 Journey" owned={journey.length} target={165} onClick={() => askMori("What am I missing from my 151 Journey?")} />
    </div>
    <h2 className="mb-2 mt-5 text-lg font-bold">Ideas from Mori</h2>
    <div className={carousel}>{IDEAS.map(idea => <Button variant="outline" key={idea.title} onClick={() => askMori(idea.title)} className="h-[206px] w-[162px] shrink-0 snap-start flex-col items-start justify-start gap-0 whitespace-normal rounded-2xl border-border bg-card p-2 text-left text-foreground shadow-none">{ideaImages[idea.cardId] ? <img src={ideaImages[idea.cardId]} alt="" className="h-[116px] w-full rounded-xl object-contain" /> : <div className="h-[116px] w-full rounded-xl bg-accent" />}<span className="mt-2 text-[10px] font-bold text-primary">{idea.kicker}</span><span className="mt-1 text-sm font-bold leading-snug">{idea.title}</span></Button>)}</div>
    <Dialog.Root open={prompt} onOpenChange={setPrompt}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-transparent" /><Dialog.Content aria-describedby={undefined} className="fixed bottom-[92px] left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 grid-cols-[42px_minmax(0,1fr)] gap-x-3 rounded-3xl border border-border bg-card p-4 shadow-orb outline-none"><Mori className="h-12 w-10" /><div><p className="text-[11px] font-bold text-primary">Today’s memory prompt</p><Dialog.Title className="mt-1 text-base font-bold leading-snug">{question}</Dialog.Title><div className="mt-3 flex gap-2"><Button onClick={() => { setPrompt(false); askMori(question); }} className="rounded-full font-bold">Tell Mori</Button><Dialog.Close asChild><Button variant="outline" className="rounded-full font-bold">Later</Button></Dialog.Close></div></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </AppShell>;
}
