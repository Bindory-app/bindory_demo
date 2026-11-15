import { createFileRoute } from "@tanstack/react-router";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mori } from "@/components/Mori";
import { moriReply } from "@/lib/mori";

export const Route = createFileRoute("/mori")({
  head: () => ({
    meta: [
      { title: "Ask Mori · Bindory" },
      { name: "description", content: "Chat with Mori about your cards, sets and collecting memories." },
      { property: "og:title", content: "Ask Mori · Bindory" },
      { property: "og:description", content: "Chat with Mori, your AI collector companion." },
    ],
  }),
  component: AskMori,
});

type Msg = { from: "me" | "mori"; text: string };
const suggestions = ["How many cards do I have?", "Show my trip to Tokyo", "Would my Charizard grade well?"];

function AskMori() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "mori", text: "Hi! I'm Mori. Ask me anything about your collection." }]);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); input.current?.focus(); }, [msgs]);

  const send = (t: string) => {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { from: "me", text: t }, { from: "mori", text: moriReply(t) }]);
    setText("");
  };

  return (
    <AppShell title="Ask Mori">
      <div className="flex flex-col items-center py-2">
        <Mori className="h-36 w-36" />
      </div>
      <div className="space-y-3">
        {msgs.map((m, i) => (
          <p key={i} className={m.from === "me" ? "ml-auto w-fit max-w-[80%] whitespace-pre-line rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "w-fit max-w-[85%] whitespace-pre-line rounded-3xl rounded-bl-md border border-border bg-card px-4 py-2.5"}>
            {m.text}
          </p>
        ))}
        <div ref={end} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary">{s}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="fixed bottom-24 left-1/2 z-10 flex w-[calc(100%-2.5rem)] max-w-[350px] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-orb">
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Mori…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        <button aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground"><SendHorizontal className="h-5 w-5" /></button>
      </form>
      <div className="h-20" />
    </AppShell>
  );
}
