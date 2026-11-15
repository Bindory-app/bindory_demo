import { createFileRoute, Link } from "@tanstack/react-router";
import { BookHeart, Camera, Layers, Mic, Plus, SendHorizontal, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Mori } from "@/components/Mori";
import { guestReply } from "@/lib/mori";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ask Mori · Bindory" },
      { name: "description", content: "Meet Mori, your Bindory agent for Pokémon TCG collecting." },
      { property: "og:title", content: "Ask Mori · Bindory" },
      { property: "og:description", content: "Meet Mori, your Bindory agent for Pokémon TCG collecting." },
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

type Msg = { from: "me" | "mori"; text: string };

function GuestAskMori() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const send = (t: string) => {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { from: "me", text: t }, { from: "mori", text: guestReply(t) }]);
    setText("");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-background shadow-phone">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 pb-2 pt-5">
          <p className="min-w-0 truncate text-sm font-bold">
            Ask Mori <span className="font-medium text-muted-foreground">· your Bindory Agent</span>
          </p>
          <div className="flex shrink-0 gap-1.5">
            <Link to="/login" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold">Log in</Link>
            <Link to="/signup" className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-primary-foreground">Sign up</Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-5 pb-28">
          {msgs.length === 0 ? (
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
                <p key={i} className={m.from === "me" ? "ml-auto w-fit max-w-[80%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "w-fit max-w-[85%] rounded-3xl rounded-bl-md border border-border bg-card px-4 py-2.5"}>{m.text}</p>
              ))}
            </div>
          )}
        </main>

        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="fixed bottom-5 left-1/2 z-10 flex w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-orb">
          <button type="button" aria-label="Add a photo" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary hover:bg-accent"><Camera className="h-5 w-5" /></button>
          <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message Mori" autoFocus className="min-w-0 flex-1 bg-transparent px-1 outline-none" />
          <button type="button" aria-label="Voice message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary hover:bg-accent"><Mic className="h-5 w-5" /></button>
          <button aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground"><SendHorizontal className="h-5 w-5" /></button>
        </form>
      </div>
    </div>
  );
}
