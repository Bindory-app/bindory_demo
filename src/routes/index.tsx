import { createFileRoute } from "@tanstack/react-router";
import { BookHeart, Camera, Layers, Mic, Plus, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { confirmProposal, loadMoriHistory, type MoriStreamEvent } from "@/lib/mori.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MoriTranscript } from "@/components/MoriTranscript";
import { Button } from "@/components/ui/button";
import type { ProposalPayload } from "@/lib/mori-tools";
import { AuthSheet } from "@/components/AuthSheet";
import { BottomNav } from "@/components/AppShell";
import { useSession } from "@/hooks/use-session";
import { savePendingIntent, takePendingIntent } from "@/lib/pending-intent";
import { supabase } from "@/integrations/supabase/client";
import { Mori } from "@/components/Mori";
import { ONBOARDING_GREETING, onboardingSteps, searchCards } from "@/lib/onboarding";
import {
  canAcceptMessage,
  greetingFor,
  mergeDoneMessages,
  shouldRefocusAfterReply,
} from "@/lib/mori-chat-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask Mori · Bindory" },
      { name: "description", content: "Meet Mori, your Bindory agent for Pokémon TCG collecting." },
      { property: "og:title", content: "Ask Mori · Bindory" },
      {
        property: "og:description",
        content: "Meet Mori, your Bindory agent for Pokémon TCG collecting.",
      },
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
type Msg = {
  id?: string | undefined;
  from: "me" | "mori";
  text: string;
  chips?: Chip[] | undefined;
  kind?: string | undefined;
  payload?: ProposalPayload | undefined;
};
type Row = { id: string; role: string; kind: string; content: string; payload: unknown };
const fromRow = (r: Row): Msg => ({
  id: r.id,
  from: r.role === "user" ? "me" : "mori",
  text: r.content,
  kind: r.kind,
  payload: r.kind === "confirm" ? (r.payload as ProposalPayload) : undefined,
});
type Phase = "guest" | "loading" | "profile-error" | "onboarding" | "chat";

function GuestAskMori() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const { session, ready } = useSession();
  const [sheet, setSheet] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [profileRetry, setProfileRetry] = useState(0);
  const [phase, setPhase] = useState<Phase>("guest");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchBusy = useRef(false);
  const intentRef = useRef<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const say = (...m: Msg[]) =>
    setMsgs((prev) => [...prev.map((x) => ({ ...x, chips: undefined })), ...m]);

  const confirm_ = useServerFn(confirmProposal);
  const history_ = useServerFn(loadMoriHistory);
  const [thinking, setThinking] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [streamText, setStreamText] = useState("");
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const reply = async (t: string, shown = t) => {
    say({ from: "me", text: shown });
    setThinking(true);
    setStreamText("");
    setStatusLines([]);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const response = await fetch("/api/mori-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionRef.current?.access_token ?? ""}`,
        },
        body: JSON.stringify({ message: t }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body) throw new Error("Chat unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as MoriStreamEvent;
          if (event.type === "text") setStreamText((previous) => previous + event.text);
          if (event.type === "status") {
            setStreamText("");
            setStatusLines((previous) => [...previous, event.text]);
          }
          if (event.type === "done") {
            setStreamText("");
            setStatusLines([]);
            setMsgs((previous) => mergeDoneMessages(previous, event.rows.map(fromRow)));
          }
          if (event.type === "error") throw new Error(event.text);
        }
      }
    } catch (e) {
      if (abort.signal.aborted) return;
      console.error(e);
      say({ from: "mori", text: "Sorry, I could not answer just now. Please try again." });
    } finally {
      setThinking(false);
      setStreamText("");
      setStatusLines([]);
      if (
        shouldRefocusAfterReply(
          navigator.maxTouchPoints,
          window.matchMedia("(pointer: coarse)").matches,
        )
      )
        inputRef.current?.focus();
    }
  };

  const act = async (m: Msg, action: "confirm" | "edit") => {
    if (!m.id || !m.payload) return;
    setWorking(true);
    try {
      const r = await confirm_({ data: { messageId: m.id, action } });
      setMsgs((prev) =>
        prev.map((x) =>
          x.id === m.id && x.payload ? { ...x, payload: { ...x.payload, status: r.done } } : x,
        ),
      );
      if (r.reply) say(fromRow(r.reply));
      if (action === "edit") {
        setText("Change it: ");
        inputRef.current?.focus();
      }
    } catch (e) {
      console.error(e);
      say({ from: "mori", text: "I could not save that. Please try again." });
    } finally {
      setWorking(false);
    }
  };

  const attachPhoto = async (file: File) => {
    if (!session) {
      setSheet(true);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("memory-photos")
      .upload(path, file, { contentType: file.type });
    if (error) {
      console.error(error);
      say({ from: "mori", text: "I could not attach that photo. Please try again." });
      return;
    }
    void reply(`I attached a photo for this memory. [photo_path: ${path}]`, "Photo attached");
  };

  const ask = (i: number) => {
    const s = onboardingSteps[i];
    if (!s) return { from: "mori" as const, text: "What shall we do today?" };
    return { from: "mori" as const, text: s.question, chips: s.chips.map((label) => ({ label })) };
  };

  // On sign-in: new collectors get onboarding in chat, returning ones go straight on.
  useEffect(() => {
    const userId = session?.user.id;
    let cancelled = false;
    if (!userId) {
      abortRef.current?.abort();
      setMsgs([]);
      setName("");
      intentRef.current = null;
      setPhase("guest");
      return;
    }
    setSheet(false);
    setPhase("loading");
    const intent = intentRef.current ?? takePendingIntent();
    intentRef.current = intent;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarded_at, display_name")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setPhase("profile-error");
          return;
        }
        setName(data?.display_name?.trim() || "");
        if (data?.onboarded_at) {
          setPhase("chat");
          try {
            const rows = await history_();
            if (cancelled) return;
            setMsgs(rows.map(fromRow));
          } catch (e) {
            console.error(e);
          }
          if (cancelled) return;
          intentRef.current = null;
          if (intent) void reply(intent);
        } else {
          setPending(intent);
          setPhase("onboarding");
          setStep(0);
          setAnswers({});
          setMsgs([{ from: "mori", text: ONBOARDING_GREETING }, ask(0)]);
        }
      } catch {
        if (!cancelled) setPhase("profile-error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, profileRetry]);

  const finishOnboarding = async (all: Record<string, string>) => {
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: session.user.id, onboarding_answers: all, onboarded_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) {
      say({
        from: "mori",
        text: "Sorry, I could not save your answers. Please try again.",
        chips: [{ label: "Retry saving answers" }],
      });
      return;
    }
    intentRef.current = null;
    setPhase("chat");
    if (pending) {
      say({
        from: "mori",
        text: `Earlier you asked me to “${pending}”. Shall we carry on?`,
        chips: [{ label: `Yes, ${pending.toLowerCase()}` }, { label: "Not now" }],
      });
    } else {
      say({
        from: "mori",
        text: "What shall we do today?",
        chips: starters.map((s) => ({ label: s.label })),
      });
    }
  };

  const answerStep = (answer: string) => {
    const s = onboardingSteps[step];
    if (!s) return;
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
    if (searchBusy.current) return;
    searchBusy.current = true;
    say({ from: "me", text: q });
    setBusy(true);
    const matches = await searchCards(q).catch(() => []);
    setBusy(false);
    searchBusy.current = false;
    if (!matches.length) {
      say({
        from: "mori",
        text: `I could not find any cards called “${q}”. Try another name, or tap one below.`,
        chips: onboardingSteps[step]?.chips.map((label) => ({ label })),
      });
    } else {
      say({
        from: "mori",
        text: "Is it one of these?",
        chips: matches.map((m) => ({ label: m.name, image: m.image })),
      });
    }
  };

  const tapChip = (label: string) => {
    if (!canAcceptMessage(phase, thinking, searchBusy.current)) return;
    if (label === "Retry saving answers") return void finishOnboarding(answers);
    if (phase === "onboarding") return answerStep(label);
    if (label === "Not now") {
      setPending(null);
      return say(
        { from: "me", text: label },
        { from: "mori", text: "No problem. I am here whenever you are ready." },
      );
    }
    if (pending && label.startsWith("Yes, ")) {
      const p = pending;
      setPending(null);
      return void reply(p);
    }
    void reply(label);
  };

  const send = (t: string) => {
    if (!t.trim()) return;
    if (!canAcceptMessage(phase, thinking, searchBusy.current)) return;
    setText("");
    if (!session) {
      savePendingIntent(t);
      setSheet(true);
      return;
    }
    if (phase === "onboarding") {
      if (onboardingSteps[step]?.cardSearch) return void typedCard(t.trim());
      return answerStep(t.trim());
    }
    if (thinking) return;
    void reply(t);
  };
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setSheet(true);
  };
  const showNav = phase === "chat";
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <div
        className={`relative mx-auto flex h-dvh min-h-[600px] w-full max-w-[390px] flex-col shadow-phone ${showNav ? "bg-card" : "bg-background"}`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 pb-2 pt-5">
          {session ? (
            <div className="flex min-w-0 items-center gap-3">
              <Mori className="h-12 w-11 shrink-0" />
              <div>
                <p className="text-xs font-bold text-primary">Your Bindory Agent</p>
                <h1 className="text-3xl font-bold">Ask Mori</h1>
              </div>
            </div>
          ) : (
            <p className="min-w-0 truncate text-sm font-bold">
              Ask Mori{" "}
              <span className="font-medium text-muted-foreground">· your Bindory Agent</span>
            </p>
          )}
          {ready && !session && (
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant="outline"
                onClick={() => openAuth("login")}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground"
              >
                Log in
              </Button>
              <Button
                onClick={() => openAuth("signup")}
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                Sign up
              </Button>
            </div>
          )}
        </header>

        <main className={`flex min-h-0 flex-1 flex-col px-5 ${showNav ? "pb-44" : "pb-28"}`}>
          {phase === "loading" ? (
            <div className="flex flex-1 items-center justify-center">
              <Mori className="h-40 w-40 animate-pulse" />
            </div>
          ) : phase === "profile-error" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p role="alert">Sorry, I could not load your profile</p>
              <Button
                onClick={() => setProfileRetry((previous) => previous + 1)}
                className="rounded-full"
              >
                Retry
              </Button>
            </div>
          ) : msgs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Mori className="h-52 w-52" />
              <h1 className="mt-4 text-2xl font-bold leading-snug">
                {showNav ? greetingFor(name) : "Hi, I am Mori. What shall we do today?"}
              </h1>
              <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
                {starters.map(({ label, icon: Icon }) => (
                  <Button
                    key={label}
                    onClick={() => send(label)}
                    variant="outline"
                    className="h-11 whitespace-normal rounded-full bg-card px-2 text-sm font-bold text-foreground"
                  >
                    {!showNav && <Icon className="h-4 w-4 shrink-0 text-primary" />}
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Conversation className="min-h-0">
              <ConversationContent className="gap-3 p-0 pt-3">
                {msgs.map((message, index) => (
                  <MoriTranscript
                    key={message.id ?? index}
                    message={message}
                    working={working}
                    tapChip={tapChip}
                    act={(message, action) => void act(message, action)}
                  />
                ))}
                {statusLines.map((line, index) => (
                  <p key={index} className="pl-10 text-xs text-muted-foreground">
                    {line}
                  </p>
                ))}
                {streamText && (
                  <MoriTranscript
                    message={{ from: "mori", text: streamText }}
                    working={false}
                    tapChip={tapChip}
                    act={() => {}}
                  />
                )}
                {thinking && !streamText && (
                  <Shimmer className="pl-10 text-xs">Mori is thinking…</Shimmer>
                )}
                {busy && <Shimmer className="pl-10 text-xs">Searching the card catalogue</Shimmer>}
                <div ref={endRef} />
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          )}
        </main>

        <div
          className={`fixed ${showNav ? "bottom-[90px]" : "bottom-5"} left-1/2 z-10 w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void attachPhoto(file);
            }}
          />
          <PromptInput
            onSubmit={({ text: submitted }) => send(submitted)}
            className="[&_[data-slot=input-group]]:rounded-3xl [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-orb"
          >
            <PromptInputTextarea
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Message Mori"
              placeholder={showNav ? "Ask, add, remember or create" : ""}
              className="min-h-10 text-sm"
            />
            <PromptInputFooter className="justify-between px-2 pb-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Add a photo"
                  disabled={thinking}
                  onClick={() => (session ? fileRef.current?.click() : setSheet(true))}
                  className="rounded-full text-muted-foreground"
                >
                  <Camera />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Voice message"
                  disabled
                  className="rounded-full text-muted-foreground"
                >
                  <Mic />
                </Button>
              </div>
              <PromptInputSubmit
                status={thinking ? (streamText ? "streaming" : "submitted") : "ready"}
                onStop={() => abortRef.current?.abort()}
                disabled={
                  !thinking &&
                  (!text.trim() || busy || phase === "loading" || phase === "profile-error")
                }
                className="size-10 rounded-full"
                aria-label={thinking ? "Stop" : "Send"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
        {showNav && <BottomNav home />}
        <AuthSheet
          open={sheet}
          onOpenChange={setSheet}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </div>
    </div>
  );
}
