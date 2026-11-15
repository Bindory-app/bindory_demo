import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { savePendingIntent } from "@/lib/pending-intent";

export const Route = createFileRoute("/trending-binders")({
  head: () => ({ meta: [
    { title: "Trending binders · Bindory" }, { name: "description", content: "Favourite Illustrator Week community showcase." },
    { property: "og:title", content: "Trending binders · Bindory" }, { property: "og:description", content: "Favourite Illustrator Week community showcase." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: TrendingBinders,
});
function TrendingBinders() {
  const navigate = useNavigate();
  return <AppShell title="Trending binders"><div className="bg-showcase -mx-5 px-5 py-10 text-primary-foreground"><p className="text-sm font-semibold">Community showcase</p><h2 className="mt-2 text-2xl font-bold">Favourite Illustrator Week</h2></div><p className="my-6 text-sm text-muted-foreground">I could not find any trending binders.</p><Button className="rounded-full bg-brand" onClick={() => { savePendingIntent("Help me build a binder around my favourite illustrator"); void navigate({ to: "/" }); }}>Ask Mori</Button></AppShell>;
}