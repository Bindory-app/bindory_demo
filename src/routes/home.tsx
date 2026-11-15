import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, MessageCircle, Sparkles, Star } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { AppShell, ThemeToggle } from "@/components/AppShell";
import { HomeProgress } from "@/components/HomeProgress";
import { Button } from "@/components/ui/button";
import { Mori } from "@/components/Mori";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { savePendingIntent } from "@/lib/pending-intent";
import { HOME_EVENTS, memoryPromptKey, memoryQuestion } from "@/lib/home-content";

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
  { title: "Log my Japan trip", note: "Turn your trip into memories" },
  { title: "Group your moon themed cards", note: "Mori finds them for you" },
  { title: "Finish your next binder page", note: "See what is missing" },
  { title: "Make a story card", note: "Share the why behind a card" },
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
  const askMori = (text?: string) => { if (text) savePendingIntent(text); void navigate({ to: "/" }); };

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

  return <AppShell title={`Hi, ${name}`} action={<div className="flex items-center gap-2"><Button asChild className="rounded-full bg-brand px-3 font-bold"><Link to="/studio"><Star />{points} pts</Link></Button><ThemeToggle /></div>}>
    <Button variant="outline" onClick={() => askMori()} className="h-12 w-full justify-start rounded-full bg-card px-4 text-muted-foreground shadow-none"><MessageCircle className="text-primary" />Ask Mori</Button>
    <h2 className="mb-3 mt-6 text-lg font-bold">Events</h2>
    <div className={carousel}>
      {HOME_EVENTS.map(event => <Button asChild key={event.title} className={`h-40 w-72 shrink-0 snap-start flex-col items-start justify-between whitespace-normal rounded-3xl p-5 text-left text-primary-foreground shadow-none ${event.theme}`}><Link to={event.to}><span className="flex items-center gap-2 text-xs font-semibold"><CalendarDays />{event.label}</span><span className="flex w-full items-end justify-between gap-3"><span className="text-xl font-bold leading-snug">{event.title}</span><ArrowUpRight /></span></Link></Button>)}
    </div>
    <h2 className="mb-3 mt-6 text-lg font-bold">Keep your set going</h2>
    <div className={carousel}>
      <HomeProgress name="Favourite artworks" owned={artworks.length} target={20} images={artworks.flatMap(card => card.image_url ? [card.image_url] : [])} onClick={() => askMori("Help me keep my Favourite artworks binder going toward 20 cards")} />
      <HomeProgress name="151 Journey" owned={journey.length} target={165} images={journey.flatMap(card => card.image_url ? [card.image_url] : [])} onClick={() => askMori("What am I missing from my 151 Journey?")} />
    </div>
    <h2 className="mb-3 mt-6 text-lg font-bold">Ideas from Mori</h2>
    <div className={carousel}>{IDEAS.map(idea => <Button variant="outline" key={idea.title} onClick={() => askMori(idea.title)} className="h-36 w-56 shrink-0 snap-start flex-col items-start justify-start gap-0 whitespace-normal rounded-3xl bg-card p-4 text-left shadow-none"><Sparkles className="text-primary" /><span className="mt-3 font-bold">{idea.title}</span><span className="mt-1 text-sm text-muted-foreground">{idea.note}</span></Button>)}</div>
    <Dialog.Root open={prompt} onOpenChange={setPrompt}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/30" /><Dialog.Content aria-describedby={undefined} className="fixed bottom-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 rounded-t-3xl bg-card px-6 pb-8 pt-5 text-center outline-none"><Mori className="mx-auto h-32 w-32" /><p className="mt-3 text-xs font-semibold text-primary">Today’s memory prompt</p><Dialog.Title className="mt-2 text-xl font-bold leading-snug">{question}</Dialog.Title><Button onClick={() => { setPrompt(false); askMori(question); }} className="mt-6 h-12 w-full rounded-full bg-brand font-bold">Tell Mori</Button><Dialog.Close asChild><Button variant="ghost" className="mt-2 h-11 w-full rounded-full text-muted-foreground">Later</Button></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </AppShell>;
}
