import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { savePendingIntent } from "@/lib/pending-intent";

export const Route = createFileRoute("/create-binder")({
  head: () => ({ meta: [
    { title: "Create binder · Bindory" }, { name: "description", content: "Start your Complete a Master Set collector challenge with Mori." },
    { property: "og:title", content: "Create binder · Bindory" }, { property: "og:description", content: "Start your Complete a Master Set collector challenge with Mori." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CreateBinder,
});
function CreateBinder() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  return <AppShell title="Create binder"><div className="bg-challenge -mx-5 px-5 py-10 text-primary-foreground"><p className="text-sm font-semibold">Collector challenge</p><h2 className="mt-2 text-2xl font-bold">Complete a Master Set</h2></div><form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; savePendingIntent(`Help me create a master set binder named ${name.trim()}. Ask me which set to collect.`); void navigate({ to: "/" }); }}><label className="block text-sm font-semibold">Binder name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 block w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><Button type="submit" className="w-full rounded-full bg-brand">Continue with Mori</Button></form></AppShell>;
}