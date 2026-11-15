import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  BookHeart,
  Flame,
  Layers,
  Lock,
  Sparkles,
  Star,
  WandSparkles,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Mori } from "@/components/Mori";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Toast } from "@/components/Toast";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { dbToday, loadProfileData, type ProfileData } from "@/lib/profile-data";
import {
  BADGES,
  currentStreak,
  isOutfitId,
  levelFor,
  moriStage,
  WARDROBE,
  type OutfitId,
} from "@/lib/progress";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Mori Studio · Bindory" },
      { name: "description", content: "Your progress with Mori: levels, streaks and badges." },
      { property: "og:title", content: "Mori Studio · Bindory" },
      {
        property: "og:description",
        content: "Your progress with Mori: levels, streaks and badges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Studio,
});

const BADGE_ICONS: Record<string, typeof Star> = {
  first_card: Sparkles,
  ten_cards: Star,
  binder: Layers,
  storyteller: BookHeart,
  first_post: Award,
  made_with_mori: WandSparkles,
  streak3: Flame,
};

function Studio() {
  const { session, ready } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState(false);
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

  const close = () => {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/profile" });
  };
  const action = (
    <button
      type="button"
      onClick={close}
      aria-label="Close"
      className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"
    >
      <X className="size-6" />
    </button>
  );

  if (ready && !session)
    return (
      <AppShell title="Mori Studio" kicker="Our progress" action={action}>
        <SignInPrompt what="your progress with Mori" />
      </AppShell>
    );

  const today = dbToday();
  const lvl = levelFor(data?.points ?? 0);
  const streak = currentStreak(data?.checkIns ?? [], today);
  const checkedIn = data?.checkIns.includes(today) ?? false;
  const worn = data?.profile?.mori_outfit;
  const outfit: OutfitId | null = isOutfitId(worn) ? worn : null;
  const stats = {
    cards: data?.counts.cards ?? 0,
    binders: data?.binders.length ?? 0,
    memories: data?.counts.memories ?? 0,
    posts: data?.posts.filter((p) => p.is_public).length ?? 0,
    moriPosts: data?.posts.filter((p) => p.made_with_mori).length ?? 0,
    streak,
  };

  const checkIn = async () => {
    if (!uid || checkedIn || busy) return;
    setBusy(true);
    const { error } = await supabase.from("check_ins").insert({ user_id: uid });
    setBusy(false);
    if (error) setToast("Could not check in. Please try again.");
    else {
      setToast("Checked in · +10 points");
      setRevision((r) => r + 1);
    }
  };

  const wear = async (id: OutfitId) => {
    if (!uid || busy) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ mori_outfit: id }).eq("id", uid);
    setBusy(false);
    if (error) setToast("Could not change Mori's outfit.");
    else setRevision((r) => r + 1);
  };

  return (
    <AppShell title="Mori Studio" kicker="Our progress" action={action}>
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          Could not load your progress.{" "}
          <button className="underline" onClick={() => setRevision((r) => r + 1)}>
            Try again
          </button>
        </p>
      )}

      <section className="overflow-hidden rounded-[28px] bg-gradient-to-b from-[#2b2361] to-[#6a52c9] p-4 text-white">
        <div className="rounded-3xl bg-white/5 py-4">
          <Mori className="mx-auto h-48 w-48" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#e4d7ff]">Mori</p>
        <h2 className="text-2xl font-bold">
          Level {lvl.level} · {moriStage(lvl.level)}
        </h2>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f6d9a0] to-[#c7a8ff]"
            style={{ width: `${Math.round(lvl.progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm opacity-85">Grows as you collect, remember and create</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {WARDROBE.map((w) => {
            const unlocked = lvl.level >= w.unlock;
            const on = outfit === w.id;
            return (
              <button
                key={w.id}
                type="button"
                disabled={!unlocked || on || busy}
                onClick={() => void wear(w.id)}
                className={`flex flex-col items-center rounded-2xl border px-1 py-3 text-center ${on ? "border-[#f6d9a0] bg-white/15" : "border-white/20 bg-white/5"} ${unlocked ? "" : "opacity-60"}`}
              >
                <span className="relative h-8 w-8 rounded-full" style={{ background: w.swatch }}>
                  {!unlocked && <Lock className="absolute inset-0 m-auto size-3.5 text-white" />}
                </span>
                <span className="mt-2 text-xs font-bold leading-tight">{w.name}</span>
                <span className="mt-1 text-[11px] opacity-80">
                  {on ? "Equipped" : unlocked ? "Wear" : `Level ${w.unlock}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <h2 className="mt-7 text-xl font-bold">Your collector level</h2>
      <section className="mt-3 rounded-[28px] bg-gradient-to-br from-primary to-[#8f63e8] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm opacity-90">Collector level</p>
            <p className="text-2xl font-bold">
              Level {lvl.level} · {lvl.name}
            </p>
          </div>
          <p className="text-2xl font-bold">
            {lvl.points} <span className="text-sm font-semibold">pts</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-[#f5d77a]"
            style={{ width: `${Math.round(lvl.progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm opacity-90">
          {lvl.next !== null
            ? `${lvl.next - lvl.points} points to Level ${lvl.level + 1} · ${lvl.nextName}`
            : "Top level reached"}
        </p>
      </section>

      <section className="mt-3 flex items-center gap-4 rounded-[28px] border border-border bg-card p-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-primary text-xl font-bold text-primary">
          {streak}
        </span>
        <div>
          <p className="text-lg font-bold">
            {streak > 0 ? `Day ${streak} streak` : "Start a streak"}
          </p>
          {checkedIn ? (
            <p className="text-sm font-bold text-muted-foreground">Checked in today</p>
          ) : (
            <button
              type="button"
              onClick={() => void checkIn()}
              disabled={busy || !data}
              className="text-sm font-bold text-primary"
            >
              Check in · +10 points
            </button>
          )}
        </div>
      </section>

      <h2 className="mt-7 text-xl font-bold">Badges</h2>
      <div className="-mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
        {BADGES.map((b) => {
          const got = b.earned(stats);
          const Icon = BADGE_ICONS[b.id] ?? Star;
          return (
            <div key={b.id} className="w-20 shrink-0 text-center">
              <span
                className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${got ? "bg-gradient-to-br from-[#f3d27c] to-[#e59ac2] text-white" : "bg-secondary text-muted-foreground"}`}
              >
                <Icon className="size-7" />
              </span>
              <p className={`mt-2 text-xs font-semibold ${got ? "" : "text-muted-foreground"}`}>
                {got ? b.name : b.hint}
              </p>
            </div>
          );
        })}
      </div>

      <Toast text={toast} onDone={() => setToast("")} />
    </AppShell>
  );
}
