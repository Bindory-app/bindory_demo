import { createFileRoute } from "@tanstack/react-router";
import { Lock, Share2 } from "lucide-react";
import { useState } from "react";
import { AppShell, Panel, useTheme } from "@/components/AppShell";
import { Mori } from "@/components/Mori";
import { cards, memories } from "@/lib/data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile · Bindory" },
      { name: "description", content: "Your Bindory profile, privacy and settings." },
      { property: "og:title", content: "My profile · Bindory" },
      { property: "og:description", content: "Your Bindory profile, privacy and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { dark, toggle } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [shared, setShared] = useState(false);
  const publicMemories = memories.filter((m) => !m.private);
  return (
    <AppShell title="My profile">
      <Panel className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand text-2xl font-bold text-primary-foreground">C</div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">Collector</p>
          <p className="text-sm text-muted-foreground">{cards.length} cards · {memories.length} memories</p>
        </div>
      </Panel>

      <Panel className="mt-4 flex items-center gap-3">
        <Mori className="h-20 w-16 shrink-0" />
        <p className="text-sm">Mori is your collector companion. Private memories stay with you and are never shown to others.</p>
      </Panel>

      <Panel className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Dark mode</span>
          <button onClick={toggle} role="switch" aria-checked={dark} className={`h-7 w-12 rounded-full p-1 transition ${dark ? "bg-primary" : "bg-muted"}`}>
            <span className={`block h-5 w-5 rounded-full bg-card transition ${dark ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" />{memories.length - publicMemories.length} private memory, hidden from discovery</div>
      </Panel>

      <Panel className="mt-4">
        <p className="font-bold">Share your binder</p>
        <p className="mt-1 text-sm text-muted-foreground">Shares your cards and {publicMemories.length} shared memory. Private memories are left out.</p>
        {shared ? (
          <p className="mt-3 text-sm font-semibold text-primary">Your binder is now public.</p>
        ) : confirming ? (
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setShared(true); setConfirming(false); }} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Yes, post it</button>
            <button onClick={() => setConfirming(false)} className="rounded-full border border-border px-4 py-2 text-sm font-bold">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-primary-foreground"><Share2 className="h-4 w-4" />Share publicly</button>
        )}
      </Panel>
    </AppShell>
  );
}
