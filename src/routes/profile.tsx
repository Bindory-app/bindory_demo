import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Bookmark,
  CalendarDays,
  Clapperboard,
  Grid3X3,
  Lock,
  MapPin,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PostFull, PostTile } from "@/components/PostViews";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Toast } from "@/components/Toast";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { savePendingIntent } from "@/lib/pending-intent";
import { loadProfileData, type ProfileData } from "@/lib/profile-data";
import type { Post } from "@/lib/posts";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · Bindory" },
      { name: "description", content: "Your posts, Mori-made videos and saved binders." },
      { property: "og:title", content: "My Profile · Bindory" },
      { property: "og:description", content: "Your posts, Mori-made videos and saved binders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

type Tab = "posts" | "videos" | "saved";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Profile() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [open, setOpen] = useState<Post | null>(null);
  const [confirmShare, setConfirmShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [revision, setRevision] = useState(0);
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    setError(false);
    loadProfileData(uid)
      .then((d) => active && setData(d))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [uid, revision]);

  const settingsButton = (
    <Link
      to="/settings"
      aria-label="Settings"
      className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card"
    >
      <Settings className="size-6" />
    </Link>
  );

  if (ready && !session)
    return (
      <AppShell title="My Profile" action={settingsButton}>
        <SignInPrompt what="your profile" />
      </AppShell>
    );

  const p = data?.profile;
  const name = p?.display_name || session?.user.email?.split("@")[0] || "Collector";
  const handle = p?.username || name;
  const posts = (data?.posts ?? []).filter((x) => x.kind !== "video");
  const videos = (data?.posts ?? []).filter((x) => x.kind === "video");

  const askMori = (text: string) => {
    savePendingIntent(text);
    void navigate({ to: "/" });
  };

  const sharePost = async () => {
    if (!open || busy) return;
    setBusy(true);
    const { error } = await supabase.from("posts").update({ is_public: true }).eq("id", open.id);
    setBusy(false);
    setConfirmShare(false);
    if (error) setToast("Could not share that. Please try again.");
    else {
      setToast("Posted to your profile");
      setOpen({ ...open, is_public: true });
      setRevision((r) => r + 1);
    }
  };

  const deletePost = async () => {
    if (!open || busy) return;
    setBusy(true);
    const { error } = await supabase.from("posts").delete().eq("id", open.id);
    setBusy(false);
    if (error) setToast("Could not delete that. Please try again.");
    else {
      setOpen(null);
      setToast("Deleted");
      setRevision((r) => r + 1);
    }
  };

  return (
    <AppShell title={handle} action={settingsButton}>
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          Could not load your profile.{" "}
          <button className="underline" onClick={() => setRevision((r) => r + 1)}>
            Try again
          </button>
        </p>
      )}

      <div className="flex items-center gap-4">
        <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand p-[3px]">
          {p?.avatar_url ? (
            <img
              src={p.avatar_url}
              alt=""
              className="h-full w-full rounded-full border-2 border-card object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-full border-2 border-card bg-secondary text-3xl font-bold text-primary">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>
        <div className="grid flex-1 grid-cols-3 gap-1">
          <Stat value={(data?.posts ?? []).length} label="Posts" />
          <Stat value={data?.counts.followers ?? 0} label="Followers" />
          <Stat value={data?.counts.following ?? 0} label="Following" />
        </div>
      </div>

      <h2 className="mt-4 text-xl font-bold">{name}</h2>
      {p?.bio && <p className="mt-1 text-[15px]">{p.bio}</p>}
      {(p?.location || p?.collecting_since) && (
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {p.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />
              {p.location}
            </span>
          )}
          {p.collecting_since && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" />
              Collecting since {p.collecting_since}
            </span>
          )}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/settings"
          search={{ section: "profile" }}
          className="rounded-2xl border border-border bg-card py-2.5 text-center text-sm font-bold"
        >
          Edit profile
        </Link>
        <Link
          to="/studio"
          className="rounded-2xl border border-border bg-card py-2.5 text-center text-sm font-bold text-primary"
        >
          My progress
        </Link>
      </div>

      <div className="-mx-5 mt-5 flex gap-4 overflow-x-auto px-5 pb-1">
        {(data?.binders ?? []).map((b) => (
          <Link
            key={b.id}
            to="/binders/$id"
            params={{ id: b.id }}
            className="w-[72px] shrink-0 text-center"
          >
            <span className="block h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-secondary bg-muted p-0.5">
              {b.cover ? (
                <img
                  src={b.cover}
                  alt=""
                  className="h-full w-full rounded-full object-cover object-top"
                />
              ) : (
                <span className="block h-full w-full rounded-full bg-brand" />
              )}
            </span>
            <span className="mt-1 block truncate text-xs">{b.name}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => askMori("Help me create a binder")}
          className="w-[72px] shrink-0 text-center"
        >
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-secondary bg-secondary text-primary">
            <Plus className="size-7" />
          </span>
          <span className="mt-1 block text-xs">New</span>
        </button>
      </div>

      <div role="tablist" className="-mx-5 mt-4 grid grid-cols-3 border-b border-border">
        {(
          [
            ["posts", Grid3X3, "Posts"],
            ["videos", Clapperboard, "Videos"],
            ["saved", Bookmark, "Saved"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-label={label}
            onClick={() => setTab(id)}
            className={`grid place-items-center border-b-2 py-3 ${tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            <Icon className="size-6" />
          </button>
        ))}
      </div>

      <div className="-mx-5">
        {tab === "posts" &&
          (posts.length ? (
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((x) => (
                <div key={x.id} className="relative">
                  <PostTile post={x} onOpen={() => setOpen(x)} />
                  {!x.is_public && (
                    <Lock className="absolute bottom-1.5 right-1.5 size-4 text-white drop-shadow" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Nothing posted yet." cta="Create with Mori" to="/create" />
          ))}

        {tab === "videos" && (
          <div className="grid grid-cols-3 gap-0.5">
            <Link
              to="/create"
              search={{ kind: "video" }}
              className="flex aspect-[9/16] flex-col items-center justify-center gap-2 bg-secondary p-2 text-center text-sm font-bold text-primary"
            >
              <Plus className="size-7" />
              Create with Mori
            </Link>
            {videos.map((x) => (
              <PostTile key={x.id} post={x} reel onOpen={() => setOpen(x)} />
            ))}
          </div>
        )}

        {tab === "saved" &&
          (data?.saved.length ? (
            <div className="grid grid-cols-3 gap-0.5">
              {data.saved.map((b) => (
                <Link
                  key={b.id}
                  to="/b/$id"
                  params={{ id: b.id }}
                  className="relative aspect-square overflow-hidden bg-muted"
                >
                  {b.cover && (
                    <img src={b.cover} alt="" className="h-full w-full object-cover object-top" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-2 text-xs font-bold text-white">
                    {b.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              text="Binders you save from Search appear here."
              cta="Explore binders"
              to="/search"
            />
          ))}
      </div>

      <Dialog.Root
        open={!!open}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(null);
            setConfirmShare(false);
          }
        }}
      >
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
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(open.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {open.made_with_mori ? " · Made with Mori" : ""}
                  {open.is_public ? " · On your profile" : " · Only you can see this"}
                </p>
                <div className="mt-3 flex gap-2">
                  {!open.is_public &&
                    (confirmShare ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void sharePost()}
                        className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground"
                      >
                        Yes, post it
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmShare(true)}
                        className="flex-1 rounded-full bg-brand py-2.5 text-sm font-bold text-primary-foreground"
                      >
                        Share as a post
                      </button>
                    ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deletePost()}
                    aria-label="Delete"
                    className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast text={toast} onDone={() => setToast("")} />
    </AppShell>
  );
}

function Empty({ text, cta, to }: { text: string; cta: string; to: "/create" | "/search" }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        to={to}
        className="mt-3 inline-block rounded-full bg-secondary px-4 py-2 text-sm font-bold text-primary"
      >
        {cta}
      </Link>
    </div>
  );
}
