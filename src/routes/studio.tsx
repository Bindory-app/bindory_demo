import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { Mori } from "@/components/Mori";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Mori Studio · Bindory" },
      { name: "description", content: "Your Bindory points and how you earned them." },
      { property: "og:title", content: "Mori Studio · Bindory" },
      { property: "og:description", content: "Your Bindory points and how you earned them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell title="Mori Studio">
      <Panel className="text-center">
        <Mori className="mx-auto h-32 w-32" />
        <p className="mt-2 font-bold">Earn points by adding cards and saving memories.</p>
        <p className="mt-1 text-sm text-muted-foreground">More Studio features are on the way.</p>
      </Panel>
    </AppShell>
  ),
});
