import { createFileRoute } from "@tanstack/react-router";
import { Suspense, Component, type ReactNode } from "react";
import { useSession } from "@/hooks/use-session";
import { AppShell } from "@/components/AppShell";
import { BinderEditor } from "@/components/BinderEditor";
import { AuthSheet } from "@/components/AuthSheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/binders/$id")({
  head: () => ({
    meta: [
      { title: "Your binder · Bindory" },
      { name: "description", content: "Keep your binder cards and Mori’s reasons together." },
      { property: "og:title", content: "Your binder · Bindory" },
      {
        property: "og:description",
        content: "Keep your binder cards and Mori’s reasons together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BinderRoute,
});

class BinderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <AppShell title="Binder">
        <p role="alert">I could not load this binder.</p>
        <Button
          onClick={() => {
            window.location.reload();
          }}
          className="mt-4 rounded-full"
        >
          Retry
        </Button>
      </AppShell>
    ) : (
      this.props.children
    );
  }
}

function BinderRoute() {
  const { id } = Route.useParams();
  const { session, ready } = useSession();
  const [sheet, setSheet] = useState(false);
  if (!ready)
    return (
      <AppShell title="Binder">
        <p>Loading…</p>
      </AppShell>
    );
  if (!session)
    return (
      <AppShell title="Binder">
        <Button className="rounded-full" onClick={() => setSheet(true)}>
          Log in to edit your binder
        </Button>
        <AuthSheet open={sheet} onOpenChange={setSheet} mode="login" />
      </AppShell>
    );
  return (
    <BinderBoundary key={`${session.user.id}:${id}`}>
      <Suspense
        fallback={
          <AppShell title="Binder">
            <p>Loading your binder…</p>
          </AppShell>
        }
      >
        <BinderEditor id={id} userId={session.user.id} />
      </Suspense>
    </BinderBoundary>
  );
}
