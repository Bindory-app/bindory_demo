import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { isSaved, readProfile, setFollowing, setSaved } from "@/lib/collectors";
import { savePendingIntent } from "@/lib/pending-intent";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { loadPublicBinder } from "@/lib/binders.functions";
import { BinderCover, BinderPages } from "@/components/BinderPages";
import { Button } from "@/components/ui/button";

const publicBinderOptions = (id: string) =>
  queryOptions({
    queryKey: ["public-binder", id],
    queryFn: () => loadPublicBinder({ data: { id } }),
    staleTime: 0,
  });
export const Route = createFileRoute("/b/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(publicBinderOptions(params.id)),
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} · Bindory` : "Binder unavailable · Bindory";
    const description =
      loaderData?.description || "A Pokémon TCG binder with the stories behind its cards.";
    const cover =
      loaderData?.cards.find((c) => c.id === loaderData.cover_card_id) ?? loaderData?.cards[0];
    const image = cover?.image_url?.startsWith("https://") ? cover.image_url : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: PublicBinder,
  errorComponent: () => <PublicError />,
  notFoundComponent: () => <p>This binder is not public or could not be found.</p>,
});
function PublicError() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[390px] p-5">
      <p role="alert">I could not load this binder.</p>
      <Button className="mt-4 rounded-full" onClick={() => void router.invalidate()}>
        Retry
      </Button>
    </div>
  );
}
function PublicBinder() {
  const { id } = Route.useParams();
  const { data: binder } = useSuspenseQuery(publicBinderOptions(id));
  const { session } = useSession();
  const navigate = useNavigate();
  const router = useRouter();
  const uid = session?.user.id;
  const [saved, setSavedState] = useState(false);
  const [following, setFollowingState] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  // The page loads without your login, so "is this mine?" is worked out here in the browser.
  const [mine, setMine] = useState(false);

  useEffect(() => {
    if (!uid || !binder) return;
    let active = true;
    void isSaved(uid, binder.id).then((v) => active && setSavedState(v));
    if (binder.owner_username)
      void readProfile(binder.owner_username).then((p) => {
        if (!active || !p) return;
        setOwnerId(p.id);
        setMine(p.is_me);
        setFollowingState(p.is_following);
      });
    return () => {
      active = false;
    };
  }, [uid, binder]);

  const needSignIn = (request: string) => {
    savePendingIntent(request);
    void navigate({ to: "/" });
  };
  const toggleSave = async () => {
    if (!binder) return;
    if (!uid) return needSignIn(`Save the binder ${binder.name}`);
    setBusy(true);
    try {
      setSavedState(await setSaved(uid, binder.id, !saved));
    } catch {
      setNotice("Could not update. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const toggleFollow = async () => {
    if (!binder?.owner_username) return;
    if (!uid) return needSignIn(`Follow @${binder.owner_username}`);
    if (!ownerId) return;
    setBusy(true);
    try {
      setFollowingState(await setFollowing(uid, ownerId, !following));
    } catch {
      setNotice("Could not update. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const ownerFirst = binder?.owner?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas-outer">
      <main className="mx-auto min-h-screen w-full max-w-[390px] bg-card px-5 pb-16 pt-6">
        <div className="mb-5 flex items-start gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={() =>
              window.history.length > 1 ? router.history.back() : void navigate({ to: "/search" })
            }
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"
          >
            <X className="size-6" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Public binder
            </p>
            <h1 className="break-words text-2xl font-bold leading-tight">
              {binder?.name ?? "Binder"}
            </h1>
          </div>
        </div>
        {binder ? (
          <>
            <BinderCover
              cards={binder.cards}
              coverId={binder.cover_card_id}
              name={binder.name}
              coverImage={binder.cover_image}
              subtitle={`${binder.cards.length} cards`}
            />
            {binder.owner && (
              <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {binder.owner_avatar ? (
                    <img src={binder.owner_avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center font-bold text-primary">
                      {binder.owner.slice(0, 1)}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{binder.owner}</p>
                  {binder.owner_bio && (
                    <p className="truncate text-xs text-muted-foreground">{binder.owner_bio}</p>
                  )}
                </div>
                {binder.owner_username && (
                  <Link
                    to="/c/$username"
                    params={{ username: binder.owner_username }}
                    className="shrink-0 text-sm font-bold text-primary"
                  >
                    View profile
                  </Link>
                )}
              </div>
            )}
            {binder.description && (
              <p className="mb-4 text-sm text-muted-foreground">{binder.description}</p>
            )}
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Card gallery</h2>
              <span className="text-sm text-muted-foreground">{binder.cards.length} cards</span>
            </div>
            <BinderPages cards={binder.cards} />
            {!mine && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleSave()}
                  className={`rounded-2xl py-3 text-sm font-bold ${saved ? "bg-secondary text-primary" : "bg-brand text-primary-foreground"}`}
                >
                  {saved ? "Saved" : "Save binder"}
                </button>
                {binder.owner_username && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleFollow()}
                    className="rounded-2xl border border-border bg-secondary py-3 text-sm font-bold text-primary"
                  >
                    {following ? `Following ${ownerFirst}` : `Follow ${ownerFirst}`}
                  </button>
                )}
              </div>
            )}
            {notice && <p className="mt-3 text-center text-sm text-destructive">{notice}</p>}
          </>
        ) : (
          <p className="mt-6">This binder is not public or could not be found.</p>
        )}
      </main>
    </div>
  );
}
