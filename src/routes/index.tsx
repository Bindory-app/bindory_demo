import { createFileRoute } from "@tanstack/react-router";
import { BookHeart, Camera, Layers, Mic, Plus, SendHorizontal, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ConfirmCard } from "@/components/ConfirmCard";
import { confirmProposal, loadMoriHistory, sendToMori } from "@/lib/mori.functions";
import type { ProposalPayload } from "@/lib/mori-tools";
import { AuthSheet } from "@/components/AuthSheet";
import { BottomNav } from "@/components/AppShell";
import { useSession } from "@/hooks/use-session";
import { savePendingIntent, takePendingIntent } from "@/lib/pending-intent";
import { supabase } from "@/integrations/supabase/client";
import { Mori } from "@/components/Mori";
import { ONBOARDING_GREETING, onboardingSteps, searchCards } from "@/lib/onboarding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask Mori · Bindory" },
      { name: "description", content: "Meet Mori, your Bindory agent for Pokémon TCG collecting." },
      { property: "og:title", content: "Ask Mori · Bindory" },
      { property: "og:description", content: "Meet Mori, your Bindory agent for Pokémon TCG collecting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestAskMori,
});

const starters = [
  { label: "Save a memory", icon: BookHeart },
  { label: "Add a card", icon: Plus },
  { label: "Build a binder", icon: Layers },
  { label: "Create something", icon: WandSparkles },
];

type Chip = { label: string; image?: string | undefined };
type Msg = { id?: string | undefined; from: "me" | "mori"; text: string; chips?: Chip[] | undefined; kind?: string | undefined; payload?: ProposalPayload | undefined };
type Row = { id: string; role: string; kind: string; content: string; payload: unknown };
const fromRow = (r: Row): Msg => ({ id: r.id, from: r.role === "user" ? "me" : "mori", text: r.content, kind: r.kind, payload: r.kind === "confirm" ? (r.payload as ProposalPayload) : undefined });
type Phase = "guest" | "loading" | "onboarding" | "chat";

function GuestAskMori() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const { session, ready } = useSession();
  const [sheet, setSheet] = useState(false);
  const [phase, setPhase] = useState<Phase>("guest");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const say = (...m: Msg[]) => setMsgs((prev) => [...prev.map((x) => ({ ...x, chips: undefined })), ...m]);

  const send_ = useServerFn(sendToMori);
  const confirm_ = useServerFn(confirmProposal);
  const history_ = useServerFn(loadMoriHistory);
  const [thinking, setThinking] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  const reply = async (t: string, shown = t) => {
    say({ from: "me", text: shown });
    setThinking(true);
    try {
      const rows = await send_({ data: { message: t } });
      say(...rows.map(fromRow));
    } catch (e) {
      console.error(e);
      say({ from: "mori", text: "Sorry, I could not answer just now. Please try again." });
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  const act = async (m: Msg, action: "confirm" | "edit") => {
    if (!m.id || !m.payload) return;
    setWorking(true);
    try {
      const r = await confirm_({ data: { messageId: m.id, action } });
      setMsgs((prev) => prev.map((x) => (x.id === m.id && x.payload ? { ...x, payload: { ...x.payload, status: r.done } } : x)));
      if (r.reply) say(fromRow(r.reply));
      if (action === "edit") { setText("Change it: "); inputRef.current?.focus(); }
    } catch (e) {
      console.error(e);
      say({ from: "mori", text: "I could not save that. Please try again." });
    } finally { setWorking(false); }
  };

  const attachPhoto = async (file: File) => {
    if (!session) { setSheet(true); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("memory-photos").upload(path, file, { contentType: file.type });
    if (error) { console.error(error); say({ from: "mori", text: "I could not attach that photo. Please try again." }); return; }
    void reply(`I attached a photo for this memory. [photo_path: ${path}]`, "Photo attached");
  };

  const ask = (i: number) => {
    const s = onboardingSteps[i]!;
    return { from: "mori" as const, text: s.question, chips: s.chips.map((label) => ({ label })) };
  };

  // On sign-in: new collectors get onboarding in chat, returning ones go straight on.
  useEffect(() => {
    if (!session) { setPhase("guest"); return; }
    setSheet(false);
    setPhase("loading");
    const intent = takePendingIntent();
    void (async () => {
      const { data, error } = await supabase.from("profiles").select("onboarded_at").eq("id", session.user.id).maybeSingle();
      if (error) console.error("Could not load profile", error);
      if (data?.onboarded_at) {
        setPhase("chat");
        try { setMsgs((await history_()).map(fromRow)); } catch (e) { console.error(e); }
        if (intent) void reply(intent);
      } else {
        setPending(intent);
        setPhase("onboarding");
        setStep(0);
        setMsgs([{ from: "mori", text: ONBOARDING_GREETING }, ask(0)]);
      }
    })();
  }, [session]);

  const finishOnboarding = async (all: Record<string, string>) => {
    const { error } = await supabase.from("profiles")
      .update({ onboarding_answers: all, onboarded_at: new Date().toISOString() })
      .eq("id", session!.user.id);
    if (error) console.error("Could not save onboarding answers", error);
    setPhase("chat");
    if (pending) {
      say({ from: "mori", text: `Earlier you asked me to “${pending}”. Shall we carry on?`, chips: [{ label: `Yes, ${pending.toLowerCase()}` }, { label: "Not now" }] });
    } else {
      say({ from: "mori", text: "What shall we do today?", chips: starters.map((s) => ({ label: s.label })) });
    }
  };

  const answerStep = (answer: string) => {
    const s = onboardingSteps[step]!;
    const all = { ...answers, [s.key]: answer };
    setAnswers(all);
    const next = step + 1;
    if (next < onboardingSteps.length) {
      say({ from: "me", text: answer }, { from: "mori", text: s.reply(answer) }, ask(next));
      setStep(next);
    } else {
      say({ from: "me", text: answer }, { from: "mori", text: s.reply(answer) });
      void finishOnboarding(all);
    }
  };

  const typedCard = async (q: string) => {
    say({ from: "me", text: q });
    setBusy(true);
    const matches = await searchCards(q).catch(() => []);
    setBusy(false);
    if (!matches.length) {
      say({ from: "mori", text: `I could not find any cards called “${q}”. Try another name, or tap one below.`, chips: onboardingSteps[step]!.chips.map((label) => ({ label })) });
    } else {
      say({ from: "mori", text: "Is it one of these?", chips: matches.map((m) => ({ label: m.name, image: m.image })) });
    }
  };

  const tapChip = (label: string) => {
    if (phase === "onboarding") return answerStep(label);
    if (label === "Not now") { setPending(null); return say({ from: "me", text: label }, { from: "mori", text: "No problem. I am here whenever you are ready." }); }
    if (pending && label.startsWith("Yes, ")) { const p = pending; setPending(null); return void reply(p); }
    void reply(label);
  };

  const send = (t: string) => {
    if (!t.trim()) return;
    setText("");
    if (!session) { savePendingIntent(t); setSheet(true); return; }
    if (phase === "onboarding") {
      if (onboardingSteps[step]!.cardSearch) return void typedCard(t.trim());
      return answerStep(t.trim());
    }
    if (thinking) return;
    void reply(t);
  };
  const openAuth = () => setSheet(true);
  const showNav = phase === "chat";
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-background shadow-phone">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 pb-2 pt-5">
          <p className="min-w-0 truncate text-sm font-bold">
            Ask Mori <span className="font-medium text-muted-foreground">· your Bindory Agent</span>
          </p>
          {ready && !session && (
            <div className="flex shrink-0 gap-1.5">
              <button onClick={openAuth} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold">Log in</button>
              <button onClick={openAuth} className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-primary-foreground">Sign up</button>
            </div>
          )}
        </header>

        <main className={`flex flex-1 flex-col px-5 ${showNav ? "pb-44" : "pb-28"}`}>
          {phase === "loading" ? (
            <div className="flex flex-1 items-center justify-center"><Mori className="h-40 w-40 animate-pulse" /></div>
          ) : msgs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Mori className="h-52 w-52" />
              <h1 className="mt-4 text-2xl font-bold leading-snug">Hi, I am Mori. What shall we do today?</h1>
              <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
                {starters.map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => send(label)} className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />{label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              <Mori className="mx-auto h-24 w-24" />
              {msgs.map((m, i) => (
                m.kind === "status" ? (
                  <p key={m.id ?? i} className="flex items-center gap-1.5 pl-2 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{m.text}</p>
                ) : m.kind === "confirm" && m.payload ? (
                  <ConfirmCard key={m.id ?? i} payload={m.payload} working={working} onConfirm={() => void act(m, "confirm")} onEdit={() => void act(m, "edit")} />
                ) : (
                <div key={m.id ?? i}>
                  <p className={m.from === "me" ? "ml-auto w-fit max-w-[80%] whitespace-pre-line rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "w-fit max-w-[85%] whitespace-pre-line rounded-3xl rounded-bl-md border border-border bg-card px-4 py-2.5"}>{m.text}</p>
                  {m.chips && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.chips.map((c, ci) => (
                        <button key={`${c.label}-${ci}`} onClick={() => tapChip(c.label)} className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-primary">
                          {c.image && <img src={c.image} alt="" className="h-8 w-6 shrink-0 rounded object-contain" />}{c.label}
                        </button>
                      ))}
                      {phase === "onboarding" && <span className="self-center text-xs text-muted-foreground">or type your own</span>}
                    </div>
                  )}
                </div>
                )
              ))}
              {thinking && <p className="w-fit animate-pulse rounded-3xl border border-border bg-card px-4 py-2.5 text-muted-foreground">Mori is thinking…</p>}
              <div ref={endRef} />
              {busy && <p className="w-fit rounded-3xl border border-border bg-card px-4 py-2.5 text-muted-foreground">Looking…</p>}
            </div>
          )}
        </main>

        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className={`fixed ${showNav ? "bottom-24" : "bottom-5"} left-1/2 z-10 flex w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-orb`}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void attachPhoto(f); }} />
          <button type="button" aria-label="Add a photo" onClick={() => (session ? fileRef.current?.click() : setSheet(true))} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary hover:bg-accent"><Camera className="h-5 w-5" /></button>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} aria-label="Message Mori" autoFocus className="min-w-0 flex-1 bg-transparent px-1 outline-none" />
          <button type="button" aria-label="Voice message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary hover:bg-accent"><Mic className="h-5 w-5" /></button>
          <button aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground"><SendHorizontal className="h-5 w-5" /></button>
        </form>
        {showNav && <BottomNav />}
        <AuthSheet open={sheet} onOpenChange={setSheet} />
      </div>
    </div>
  );
}
