import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Mori } from "@/components/Mori";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in · Bindory" },
      { name: "description", content: "Log in to Bindory and collect with Mori." },
      { property: "og:title", content: "Log in · Bindory" },
      { property: "og:description", content: "Log in to Bindory and collect with Mori." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center bg-background px-5 pt-5 shadow-phone">
        <Link to="/" aria-label="Back" className="grid h-10 w-10 place-items-center self-start rounded-full border border-border bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <Mori className="mt-8 h-40 w-40" />
        <h1 className="mt-4 text-2xl font-bold">Log in</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Accounts are coming soon.</p>
      </div>
    </div>
  );
}
