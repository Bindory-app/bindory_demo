import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link2, MapPin, CalendarDays, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PostFull, PostTile } from "@/components/PostViews";
import { Toast } from "@/components/Toast";
import { useSession } from "@/hooks/use-session";
import { readProfile, setFollowing, shortCount, type PublicProfile } from "@/lib/collectors";
import { savePendingIntent } from "@/lib/pending-intent";
import type { Post } from "@/lib/posts";

export const Route = createFileRoute("/c/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · Bindory` },
      { name: "description", content: "A collector's public binders and posts on Bindory." },
      { property: "og:title", content: `@${params.username} · Bindory` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectorPage,
});

function CollectorPage() {
  const { username } = Route.useParams();
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const router = useRouter();
  const [p, setP] = useState<PublicProfile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState<Post | null>(null);
  const uid = session?.user.id;

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setP(undefined);
    readProfile(username)
      .then((d) => {
        if (!active) return;
        if (d?.is_me) void navigate({ to: "/profile", replace: true });
        else setP(d);
      })
      .catch(() => active && setP(null));
    return () => {
      active = false;
    };
  }, [username, ready, uid, navigate]);

  const close = (
    <button
      type="button"
      aria-label="Close"
      onClick={() =>
        window.history.length > 1 ? router.history.back() : void navigate({ to: "/search" })
      }
      className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"
    >
      <X className="size-6" />
    </button>
  );

  const follow = async () => {
    if (!p || busy) return;
    if (!uid) {
      savePendingIntent(`Tell me about @${p.username}'s binders`);
      void navigate({ to: "/" });
      return;
    }
    setBusy(true);
    try {
      const now = await setFollowing(uid, p.id, !p.is_following);
      setP({ ...p, is_following: now, followers: p.followers + (now ? 1 : -1) });
    } catch {
      setToast("Could not update. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Profile link copied");
    } catch {
      setToast(window.location.href);
    }
  };

  if (p === undefined)
    return (
      <AppShell title="" action={close}>
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  if (p === null)
    return (
      <AppShell title="Collector" action={close}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          This collector's profile is private or doesn't exist.
        </p>
      </AppShell>
    );

  const name = p.display_name || p.username;
  return (
    <AppShell title="" action={close}>
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4b3cc9] via-[#6a52d8] to-[#c47fd0] p-5 text-white">
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-3">
          <span className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white/90 bg-white/20">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-2xl font-bold">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{name}</h1>
            <p className="truncate text-sm opacity-90">@{p.username}</p>
            {(p.location || p.collecting_since) && (
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs opacity-90">
                {p.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {p.location}
                  </span>
                )}
                {p.collecting_since && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    Since {p.collecting_since}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        {p.bio && <p className="relative mt-3 text-[15px] leading-snug">{p.bio}</p>}
        <div className="relative mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void follow()}
            className={`flex-1 rounded-full py-2.5 text-sm font-bold ${p.is_following ? "bg-white/20 text-white ring-1 ring-white/60" : "bg-white text-[#4b3cc9]"}`}
          >
            {p.is_following ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            aria-label="Copy profile link"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/20"
          >
            <Link2 className="size-5" />
          </button>
        </div>
        <div className="relative mt-4 grid grid-cols-3 border-t border-white/25 pt-3 text-center">
          <div>
            <p className="text-xl font-bold">{shortCount(p.followers)}</p>
            <p className="text-xs opacity-85">Followers</p>
          </div>
          <div>
            <p className="text-xl font-bold">{shortCount(p.following)}</p>
            <p className="text-xs opacity-85">Following</p>
          </div>
          <div>
            <p className="text-xl font-bold">{shortCount(p.posts.length)}</p>
            <p className="text-xs opacity-85">Posts</p>
          </div>
        </div>
      </section>

      <h2 className="mb-3 mt-6 text-xl font-bold">{name.split(" ")[0]}'s binders</h2>
      {p.binders_list.length ? (
        <div className="grid grid-cols-2 gap-3">
          {p.binders_list.map((b) => {
            const art = b.cover_image?.startsWith("/demo/") ? b.cover_image : null;
            return (
              <Link
                key={b.id}
                to="/b/$id"
                params={{ id: b.id }}
                className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-muted"
              >
                {(art || b.cover) && (
                  <img
                    src={art || b.cover || ""}
                    alt=""
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-cover ${art ? "" : "object-top"}`}
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="block text-lg font-bold leading-tight">{b.name}</span>
                  <span className="mt-0.5 block text-xs opacity-90">{b.count} cards</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No public binders yet.</p>
      )}

      {p.posts.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-xl font-bold">Posts</h2>
          <div className="-mx-5 grid grid-cols-3 gap-0.5">
            {p.posts.map((x) => (
              <PostTile key={x.id} post={x} onOpen={() => setOpen(x)} />
            ))}
          </div>
        </>
      )}

      <Dialog.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card p-4"
          >
            <Dialog.Title className="pr-10 text-base font-bold">
              {open?.caption || "Post"}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-secondary"
            >
              <X className="size-5" />
            </Dialog.Close>
            {open && (
              <div className="mt-3">
                <PostFull post={open} />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Toast text={toast} onDone={() => setToast("")} />
    </AppShell>
  );
}
