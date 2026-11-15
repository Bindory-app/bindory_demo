import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/events/anniversary")({
  head: () => ({ meta: [
    { title: "Pokémon 30th Anniversary · Bindory" },
    { name: "description", content: "Featured this week: Pokémon 30th Anniversary." },
    { property: "og:title", content: "Pokémon 30th Anniversary · Bindory" },
    { property: "og:description", content: "Featured this week: Pokémon 30th Anniversary." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell title="Pokémon 30th Anniversary">
    <div className="bg-brand -mx-5 px-5 py-12 text-primary-foreground"><CalendarDays className="mb-6 size-8" /><p className="text-sm font-semibold">Featured this week</p><h2 className="mt-2 text-3xl font-bold">Pokémon 30th Anniversary</h2></div>
    <p className="my-6 text-sm text-muted-foreground">Event details are not available yet.</p>
    <Button asChild variant="outline" className="rounded-full"><Link to="/home">Back to Home</Link></Button>
  </AppShell>,
});