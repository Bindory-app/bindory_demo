import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookHeart,
  Check,
  ChevronLeft,
  Clapperboard,
  ImageIcon,
  Layers,
  PieChart,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Mori } from "@/components/Mori";
import { CoverView, RecapView, StoryCardView, VideoPlayer } from "@/components/PostViews";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Toast } from "@/components/Toast";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { buildRecap, buildStory, buildVideo } from "@/lib/create";
import { DEMO_ART, type PostKind } from "@/lib/posts";

const KINDS = ["video", "story_card", "recap", "cover"] as const;
type Kind = (typeof KINDS)[number];

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): { kind?: Kind } =>
    KINDS.includes(s["kind"] as Kind) ? { kind: s["kind"] as Kind } : {},
  head: () => ({
    meta: [
      { title: "Create with Mori · Bindory" },
      {
        name: "description",
        content: "Turn your cards and memories into videos, story cards and covers.",
      },
      { property: "og:title", content: "Create with Mori · Bindory" },
      {
        property: "og:description",
        content: "Turn your cards and memories into videos, story cards and covers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Create,
});

const OPTIONS: { kind: Kind; title: string; hint: string; Icon: typeof Clapperboard }[] = [
  { kind: "video", title: "Short video", hint: "Your cards, set to a moment", Icon: Clapperboard },
  { kind: "story_card", title: "Story card", hint: "Your words, Mori's layout", Icon: BookHeart },
  { kind: "recap", title: "Collection recap", hint: "Your collection in numbers", Icon: PieChart },
  { kind: "cover", title: "Binder cover", hint: "A cover for a binder", Icon: Layers },
];

type Card = Tables<"cards">;
type Memory = Tables<"memories">;
type Binder = Tables<"binders">;

function Create() {
  const { session, ready } = useSession();
  const { kind } = Route.useSearch();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    void Promise.all([
      supabase
        .from("cards")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("memories")
        .select("*")
        .eq("user_id", uid)
        .order("happened_on", { ascending: false }),
      supabase.from("binders").select("*").eq("user_id", uid).order("created_at"),
    ]).then(([c, m, b]) => {
      if (!active) return;
      setCards(c.data ?? []);
      setMemories(m.data ?? []);
      setBinders(b.data ?? []);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const pick = (k?: Kind) => void navigate({ to: "/create", search: k ? { kind: k } : {} });
  const back = kind ? (
    <button
      type="button"
      onClick={() => pick()}
      aria-label="Back"
      className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"
    >
      <ChevronLeft className="size-6" />
    </button>
  ) : undefined;
  const title = kind
    ? (OPTIONS.find((o) => o.kind === kind)?.title ?? "Create")
    : "Create with Mori";

  if (ready && !session)
    return (
      <AppShell title="Create with Mori" kicker="Bindory Studio">
        <SignInPrompt what="what you can make with Mori" />
      </AppShell>
    );

  const save = async (k: PostKind, caption: string, body: Json, share: boolean) => {
    if (!uid) return false;
    const { error } = await supabase
      .from("posts")
      .insert({ user_id: uid, kind: k, caption, body, made_with_mori: true, is_public: share });
    if (error) {
      setToast("Could not save that. Please try again.");
      return false;
    }
    setToast(share ? "Posted to your profile" : "Saved to Bindory Studio");
    return true;
  };

  return (
    <AppShell title={title} kicker="Bindory Studio" action={back}>
      {!kind && (
        <>
          <div className="flex items-center gap-3 rounded-3xl bg-secondary p-4">
            <Mori className="h-16 w-14 shrink-0" />
            <p className="text-sm font-semibold">
              What shall we make? I only use your own cards, memories and words.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {OPTIONS.map(({ kind: k, title: t, hint, Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => pick(k)}
                className="rounded-3xl border border-border bg-card p-4 text-left"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 font-bold">{t}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {kind && loaded && cards.length === 0 && kind !== "story_card" ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Add a few cards first, then Mori can make this.
          </p>
          <Link
            to="/"
            className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Add a card with Mori
          </Link>
        </div>
      ) : kind && !loaded ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Gathering your cards…</p>
      ) : (
        <>
          {kind === "video" && <VideoBuilder cards={cards} save={save} />}
          {kind === "story_card" && <StoryBuilder cards={cards} memories={memories} save={save} />}
          {kind === "recap" && (
            <RecapBuilder cards={cards} binders={binders} memories={memories} save={save} />
          )}
          {kind === "cover" && <CoverBuilder binders={binders} save={save} />}
        </>
      )}
      <Toast text={toast} onDone={() => setToast("")} />
    </AppShell>
  );
}

type Save = (k: PostKind, caption: string, body: Json, share: boolean) => Promise<boolean>;

/** Save privately, or post after an explicit second tap. Nothing posts without confirmation. */
function SaveBar({
  onSave,
  disabled,
}: {
  onSave: (share: boolean) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const run = async (share: boolean) => {
    setBusy(true);
    const ok = await onSave(share);
    setBusy(false);
    setConfirm(false);
    if (ok) setDone(true);
  };
  if (done)
    return (
      <div className="mt-4 flex gap-2">
        <Link
          to="/profile"
          className="flex-1 rounded-full bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
        >
          See it on my profile
        </Link>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="rounded-full border border-border px-4 text-sm font-bold"
        >
          Make another
        </button>
      </div>
    );
  return (
    <div className="mt-4">
      {confirm ? (
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">
            Post this to your profile? Anyone who visits it can see it.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(true)}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground"
            >
              Yes, post it
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="rounded-full border border-border px-4 text-sm font-bold"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => void run(false)}
            className="flex-1 rounded-full border border-border bg-card py-3 text-sm font-bold disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => setConfirm(true)}
            className="flex-1 rounded-full bg-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Share as a post
          </button>
        </div>
      )}
    </div>
  );
}

function CardPicker({
  cards,
  chosen,
  toggle,
  max,
}: {
  cards: Card[];
  chosen: string[];
  toggle: (id: string) => void;
  max: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.slice(0, 24).map((c) => {
        const i = chosen.indexOf(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            disabled={i < 0 && chosen.length >= max}
            aria-pressed={i >= 0}
            aria-label={c.name}
            className={`relative rounded-lg p-0.5 ${i >= 0 ? "bg-primary" : "bg-transparent"} disabled:opacity-40`}
          >
            {c.image_url ? (
              <img
                src={c.image_url}
                alt=""
                loading="lazy"
                className="aspect-[63/88] w-full rounded-md object-contain"
              />
            ) : (
              <span className="grid aspect-[63/88] place-items-center rounded-md bg-muted">
                <ImageIcon className="size-4" />
              </span>
            )}
            {i >= 0 && (
              <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ArtPicker({ value, set }: { value: string; set: (v: string) => void }) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {DEMO_ART.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => set(a.image)}
          aria-pressed={value === a.image}
          aria-label={a.name}
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ${value === a.image ? "ring-primary" : "ring-transparent"}`}
        >
          <img src={a.image} alt="" className="h-full w-full object-cover" />
          {value === a.image && (
            <Check className="absolute inset-0 m-auto size-6 text-white drop-shadow" />
          )}
        </button>
      ))}
    </div>
  );
}

const Label = ({ children }: { children: string }) => (
  <p className="mb-2 mt-5 text-sm font-bold">{children}</p>
);
const field =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary";

function VideoBuilder({ cards, save }: { cards: Card[]; save: Save }) {
  const [chosen, setChosen] = useState<string[]>(() => cards.slice(0, 3).map((c) => c.id));
  const [art, setArt] = useState<string>(DEMO_ART[0].image);
  const [title, setTitle] = useState("A moment with my cards");
  const picked = chosen.map((id) => cards.find((c) => c.id === id)).filter((c): c is Card => !!c);
  const body = useMemo(() => buildVideo(title, art, picked), [title, art, picked]);
  const toggle = (id: string) =>
    setChosen((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  return (
    <>
      <div className="mx-auto w-2/3">
        <VideoPlayer key={JSON.stringify(body)} body={body} title={title} />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Preview · {body.frames.length} scenes · about {body.frames.length * 3} seconds
      </p>
      <Label>Title</Label>
      <input
        className={field}
        value={title}
        maxLength={60}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Label>Opening scene</Label>
      <ArtPicker value={art} set={setArt} />
      <Label>Cards, in order (up to 5)</Label>
      <CardPicker cards={cards} chosen={chosen} toggle={toggle} max={5} />
      <SaveBar
        disabled={!picked.length}
        onSave={(share) => save("video", title, body as unknown as Json, share)}
      />
    </>
  );
}

function StoryBuilder({
  cards,
  memories,
  save,
}: {
  cards: Card[];
  memories: Memory[];
  save: Save;
}) {
  const [memoryId, setMemoryId] = useState<string>(memories[0]?.id ?? "");
  const memory = memories.find((m) => m.id === memoryId);
  const [title, setTitle] = useState(memory?.title ?? "");
  const [text, setText] = useState(memory?.note ?? "");
  useEffect(() => {
    setTitle(memory?.title ?? "");
    setText(memory?.note ?? "");
  }, [memoryId]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = buildStory({ title, text, memory, cards });
  return (
    <>
      <StoryCardView body={body} />
      {memories.length > 0 && (
        <>
          <Label>From a memory</Label>
          <select className={field} value={memoryId} onChange={(e) => setMemoryId(e.target.value)}>
            {memories.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </>
      )}
      <Label>Title</Label>
      <input
        className={field}
        value={title}
        maxLength={60}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="The card that started it"
      />
      <Label>Your words</Label>
      <textarea
        className={`${field} min-h-24`}
        value={text}
        maxLength={280}
        onChange={(e) => setText(e.target.value)}
        placeholder="What happened, in your own words"
      />
      <SaveBar
        disabled={!title.trim() || !text.trim()}
        onSave={(share) => save("story_card", title, body as unknown as Json, share)}
      />
    </>
  );
}

function RecapBuilder({
  cards,
  binders,
  memories,
  save,
}: {
  cards: Card[];
  binders: Binder[];
  memories: Memory[];
  save: Save;
}) {
  const body = useMemo(
    () => buildRecap(cards, binders.length, memories.length, new Date()),
    [cards, binders.length, memories.length],
  );
  return (
    <>
      <RecapView body={body} />
      <p className="mt-3 text-sm text-muted-foreground">
        Mori counted these from your own collection. Nothing is estimated or made up.
      </p>
      <SaveBar onSave={(share) => save("recap", body.title, body as unknown as Json, share)} />
    </>
  );
}

function CoverBuilder({ binders, save }: { binders: Binder[]; save: Save }) {
  const [binderId, setBinderId] = useState(binders[0]?.id ?? "");
  const [art, setArt] = useState<string>(DEMO_ART[1].image);
  const binder = binders.find((b) => b.id === binderId);
  const body = { title: binder?.name ?? "My binder", image: art, subtitle: "Binder" };
  if (!binders.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Make a binder with Mori first, then design its cover here.
      </p>
    );
  return (
    <>
      <div className="mx-auto w-3/4">
        <CoverView body={body} />
      </div>
      <Label>Binder</Label>
      <select className={field} value={binderId} onChange={(e) => setBinderId(e.target.value)}>
        {binders.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <Label>Artwork</Label>
      <ArtPicker value={art} set={setArt} />
      <UseAsCover binderId={binderId} image={art} name={body.title} />
      <SaveBar
        onSave={(share) =>
          save("cover", `A new cover for ${body.title}`, body as unknown as Json, share)
        }
      />
    </>
  );
}

/** Applies the chosen artwork to the binder itself, so it shows in Collection, Search and Profile. */
function UseAsCover({ binderId, image, name }: { binderId: string; image: string; name: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  useEffect(() => setState("idle"), [binderId, image]);
  const apply = async () => {
    setState("busy");
    const { error } = await supabase
      .from("binders")
      .update({ cover_image: image })
      .eq("id", binderId);
    setState(error ? "error" : "done");
  };
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={state === "busy" || state === "done"}
        onClick={() => void apply()}
        className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {state === "done" ? `Now the cover of ${name}` : `Use as the cover of ${name}`}
      </button>
      {state === "error" && (
        <p className="mt-2 text-center text-sm text-destructive">
          Could not change the cover. Please try again.
        </p>
      )}
    </div>
  );
}
