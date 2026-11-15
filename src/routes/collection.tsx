import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookHeart, ChevronLeft, ChevronRight, Image, Layers, Plus, Search, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { AppShell } from "@/components/AppShell";
import { Grails, GrailCardMenu } from "@/components/GrailCards";
import { Mori } from "@/components/Mori";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { savePendingIntent } from "@/lib/pending-intent";
import { assignGrail, claimCollectionNotice, collectionPage, MOON_REQUEST } from "@/lib/collection";

type Card = Tables<"cards">;
type Binder = Tables<"binders">;
type Memory = Tables<"memories">;
type Wish = Tables<"wishlist">;
type Membership = Tables<"binder_cards">;

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "My Collection · Bindory" },
      {
        name: "description",
        content: "Your Pokémon TCG cards, binders, private memories and wish list in Bindory.",
      },
      { property: "og:title", content: "My Collection · Bindory" },
      {
        property: "og:description",
        content: "Keep your cards and the stories behind them together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Collection,
});

function CardPhoto({
  src,
  name,
  className = "",
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  return src ? (
    <img src={src} alt={name} loading="lazy" className={`w-full object-contain ${className}`} />
  ) : (
    <div
      className={`grid w-full place-items-center rounded-xl bg-muted text-muted-foreground ${className}`}
    >
      <Image aria-label="No image" className="size-6" />
    </div>
  );
}

function Collection() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [binders, setBinders] = useState<Binder[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingGrail, setSavingGrail] = useState(false);
  const [grailError, setGrailError] = useState("");
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(false);
  const [detail, setDetail] = useState<Card | Binder | "story" | null>(null);
  const askMori = (request: string) => {
    savePendingIntent(request);
    void navigate({ to: "/" });
  };

  useEffect(() => {
    if (!ready) return;
    setCards([]);
    setBinders([]);
    setMemories([]);
    setWishes([]);
    setMemberships([]);
    setPhotos({});
    if (!session) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    const uid = session.user.id;
    void (async () => {
      const results = await Promise.all([
        supabase
          .from("cards")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("binders")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("memories")
          .select("*")
          .eq("user_id", uid)
          .order("happened_on", { ascending: false, nullsFirst: false }),
        supabase
          .from("wishlist")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase.from("binder_cards").select("*").eq("user_id", uid).order("position"),
      ]);
      if (!active) return;
      if (results.some((result) => result.error)) {
        setError(true);
        setLoading(false);
        return;
      }
      const [c, b, m, w, links] = results;
      setCards(c.data ?? []);
      setBinders(b.data ?? []);
      setMemories(m.data ?? []);
      setWishes(w.data ?? []);
      setMemberships(links.data ?? []);
      setLoading(false);
      const paths = [
        ...(m.data ?? []).map((row) => row.photo_path),
        ...(c.data ?? []).map((row) => row.slab_photo_path),
      ].filter((path): path is string => Boolean(path));
      if (paths.length) {
        const { data } = await supabase.storage.from("memory-photos").createSignedUrls(paths, 3600);
        if (active)
          setPhotos(
            Object.fromEntries(
              (data ?? []).flatMap((row) =>
                row.path && row.signedUrl ? [[row.path, row.signedUrl]] : [],
              ),
            ),
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, session?.user.id, revision]);

  useEffect(() => {
    if (!ready || loading || error) return;
    const timer = setTimeout(() => {
      try {
        if (claimCollectionNotice(sessionStorage, session?.user.id ?? "guest")) setNotice(true);
      } catch {
        /* Do not repeat when session storage is unavailable. */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [ready, loading, error, session?.user.id]);

  const chooseGrail = async (card: Card, rank: number) => {
    if (!session || savingGrail) return;
    setSavingGrail(true);
    setGrailError("");
    const { error } = await supabase.rpc("set_card_grail", {
      p_card_id: card.id,
      p_rank: rank,
    });
    if (error) setGrailError("I could not save your grail. Please try again.");
    else setCards((previous) => assignGrail(previous, card.id, rank));
    setSavingGrail(false);
  };
  const uploadSlab = async (card: Card, file: File) => {
    if (!session || savingGrail) return;
    setSavingGrail(true);
    setGrailError("");
    const path = `${session.user.id}/slabs/${crypto.randomUUID()}`;
    const bucket = supabase.storage.from("memory-photos");
    const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type });
    const { error } = uploadError
      ? { error: uploadError }
      : await supabase
          .from("cards")
          .update({ slab_photo_path: path })
          .eq("id", card.id)
          .eq("user_id", session.user.id);
    if (error) {
      if (!uploadError) await bucket.remove([path]);
      setGrailError("I could not save your slab photo. Please try again.");
    } else setRevision((value) => value + 1);
    setSavingGrail(false);
  };
  const results = collectionPage(cards, query, page);
  const binderCards = (binder: Binder) =>
    memberships
      .filter((row) => row.binder_id === binder.id)
      .flatMap((row) => {
        const card = cards.find((c) => c.id === row.card_id);
        return card ? [card] : [];
      });
  const memoryList = (story = false) => (
    <div className="space-y-3">
      {memories.map((memory) => (
        <article key={memory.id} className="border-b border-border py-3">
          <Button
            variant="ghost"
            onClick={() =>
              askMori(`Help me edit my memory "${memory.title}" (memory ID: ${memory.id})`)
            }
            className="h-auto w-full justify-start gap-3 whitespace-normal p-0 text-left hover:bg-transparent"
          >
            {memory.photo_path && photos[memory.photo_path] ? (
              <img
                src={photos[memory.photo_path]}
                alt={memory.title}
                className="size-16 shrink-0 rounded-xl object-contain"
              />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                <BookHeart />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-base font-bold">{memory.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {[memory.happened_on, memory.place, memory.with_whom].filter(Boolean).join(" · ")}
              </span>
              {!story && memory.note && (
                <span className="mt-1 line-clamp-2 block text-sm font-normal">{memory.note}</span>
              )}
            </span>
          </Button>
          {story && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{memory.note}</p>
          )}
        </article>
      ))}
    </div>
  );

  return (
    <AppShell
      title="My Collection"
      collection
      kicker="Everything you keep"
      action={
        <Button
          size="icon"
          title="Add a card"
          aria-label="Add a card to my collection"
          onClick={() => askMori("Add a card to my collection")}
          className="rounded-full"
        >
          <Plus />
        </Button>
      }
    >
      <Tabs defaultValue="cards" className="mt-2">
        <TabsList className="flex h-auto w-full justify-between gap-1.5 bg-transparent p-0">
          {(
            [
              ["cards", "Cards"],
              ["binders", "Binders"],
              ["memories", "Memories"],
              ["wishlist", "Wish list"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-full border border-border bg-card px-3 py-2 text-xs font-bold data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-banner-foreground data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-muted-foreground">
            Loading your collection…
          </p>
        ) : error ? (
          <p role="alert" className="py-12 text-center text-sm text-destructive">
            I could not load your collection. Please try again.
          </p>
        ) : (
          <>
            <TabsContent value="cards" className="mt-6">
              <Grails
                cards={cards}
                photos={photos}
                choose={(card, rank) => void chooseGrail(card, rank)}
                upload={(card, file) => void uploadSlab(card, file)}
                saving={savingGrail}
              />
              {grailError && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {grailError}
                </p>
              )}
              <div className="mb-3 mt-6 flex items-center justify-between gap-3">
                <h2 className="shrink-0 text-lg font-bold">All cards</h2>
                <label className="flex h-9 min-w-0 max-w-48 items-center gap-1.5 rounded-full border border-border px-2.5">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <Input
                    aria-label="Search collection by name, set or artist"
                    placeholder="Search cards"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    className="h-7 min-w-0 border-0 p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </label>
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                {results.cards.map((card) => (
                  <div key={card.id} className="relative min-w-0">
                    <Button
                      variant="ghost"
                      onClick={() => setDetail(card)}
                      className="h-auto min-w-0 w-full flex-col justify-start gap-1 whitespace-normal p-0 text-center hover:bg-transparent"
                    >
                      <CardPhoto
                        src={card.image_url}
                        name={card.name}
                        className="aspect-[63/88] rounded-[6px]"
                      />
                      <span className="block w-full text-[10px] font-medium leading-tight">
                        {card.name}
                      </span>
                    </Button>
                    <GrailCardMenu
                      card={card}
                      choose={(card, rank) => void chooseGrail(card, rank)}
                    />
                  </div>
                ))}
              </div>
              {!results.total && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {query
                    ? "I could not find any matching cards."
                    : "No cards in your collection yet."}
                </p>
              )}
              {!!results.total && (
                <nav
                  aria-label="Card pages"
                  className="mt-5 flex flex-wrap items-center justify-center gap-1"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous page"
                    disabled={results.page === 1}
                    onClick={() => setPage(results.page - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  {Array.from({ length: results.pages }, (_, i) => (
                    <Button
                      key={i}
                      aria-label={`Page ${i + 1}`}
                      aria-current={results.page === i + 1 ? "page" : undefined}
                      variant={results.page === i + 1 ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setPage(i + 1)}
                      className="rounded-xl border border-border"
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next page"
                    disabled={results.page === results.pages}
                    onClick={() => setPage(results.page + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </nav>
              )}
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {results.total} cards
              </p>
            </TabsContent>
            <TabsContent value="binders" className="mt-5">
              <div className="grid grid-cols-2 gap-3">
                {binders.map((binder) => {
                  const contents = binderCards(binder);
                  return (
                    <Button
                      key={binder.id}
                      variant="outline"
                      onClick={() =>
                        void navigate({ to: "/binders/$id", params: { id: binder.id } })
                      }
                      className="h-auto min-w-0 flex-col items-start gap-3 whitespace-normal rounded-2xl p-3 text-left shadow-none"
                    >
                      <div className="grid aspect-[4/3] w-full grid-cols-3 gap-1 rounded-xl bg-secondary p-2">
                        {contents.length ? (
                          contents
                            .slice()
                            .sort(
                              (a, b) =>
                                Number(b.id === binder.cover_card_id) -
                                Number(a.id === binder.cover_card_id),
                            )
                            .slice(0, 3)
                            .map((card) => (
                              <CardPhoto
                                key={card.id}
                                src={card.image_url}
                                name={card.name}
                                className="h-full min-h-0"
                              />
                            ))
                        ) : (
                          <Layers className="col-span-3 m-auto size-9 text-primary" />
                        )}
                      </div>
                      <span className="font-bold">{binder.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {contents.length} cards
                      </span>
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  onClick={() => askMori("Build a new binder for my collection")}
                  className="min-h-48 flex-col gap-3 rounded-2xl border-dashed bg-secondary/40 shadow-none"
                >
                  <Plus className="size-8 text-primary" />
                  <span className="font-bold">New binder</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="memories" className="mt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Memories</h2>
                <Button
                  variant="ghost"
                  onClick={() => askMori("Save a memory")}
                  className="rounded-full text-primary"
                >
                  <Plus />
                  Add
                </Button>
              </div>
              {memories.length ? (
                memoryList()
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No memories saved yet.
                </p>
              )}
              <Button
                variant="outline"
                disabled={!memories.length}
                onClick={() => setDetail("story")}
                className="mt-4 w-full rounded-full"
              >
                <BookHeart />
                View my story
              </Button>
            </TabsContent>
            <TabsContent value="wishlist" className="mt-5">
              <div className="space-y-3">
                {wishes.map((wish) => (
                  <Button
                    key={wish.id}
                    variant="outline"
                    onClick={() => askMori(`Tell me about ${wish.name} on my wish list`)}
                    className="h-auto w-full justify-start gap-4 whitespace-normal rounded-2xl p-3 text-left shadow-none"
                  >
                    <CardPhoto
                      src={wish.image_url}
                      name={wish.name}
                      className="aspect-[63/88] max-w-20 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold">{wish.name}</span>
                      <span className="mt-2 block text-xs font-normal leading-relaxed text-muted-foreground">
                        {wish.note || "No reason saved yet."}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              {!wishes.length && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Your wish list is empty.
                </p>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
      <Dialog.Root open={notice} onOpenChange={setNotice}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed bottom-28 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 rounded-3xl border border-border bg-card p-5 shadow-orb"
          >
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss Mori noticed"
                className="absolute right-2 top-2 rounded-full"
              >
                <X />
              </Button>
            </Dialog.Close>
            <div className="flex items-start gap-3 pr-4">
              <Mori className="h-16 w-12 shrink-0" />
              <div>
                <p className="text-xs font-bold text-primary">Mori noticed</p>
                <Dialog.Title className="mt-1 text-lg font-bold leading-snug">
                  {MOON_REQUEST}
                </Dialog.Title>
                <Button
                  onClick={() => {
                    setNotice(false);
                    askMori(MOON_REQUEST);
                  }}
                  className="mt-4 rounded-full"
                >
                  Ask Mori
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 max-h-[80dvh] w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-card p-5"
          >
            <Dialog.Title className="pr-9 text-xl font-bold">
              {detail === "story" ? "My story" : detail?.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close details"
                className="absolute right-3 top-3 rounded-full"
              >
                <X />
              </Button>
            </Dialog.Close>
            {detail === "story" ? (
              memoryList(true)
            ) : detail && "tcgdex_id" in detail ? (
              <>
                <CardPhoto
                  src={detail.image_url}
                  name={detail.name}
                  className="mx-auto mt-4 h-72"
                />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {[detail.set_name, detail.number, detail.illustrator].filter(Boolean).join(" · ")}
                </p>
              </>
            ) : (
              detail && (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">{detail.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {binderCards(detail).map((card) => (
                      <CardPhoto
                        key={card.id}
                        src={card.image_url}
                        name={card.name}
                        className="aspect-[63/88]"
                      />
                    ))}
                  </div>
                  {!binderCards(detail).length && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No cards in this binder yet.
                    </p>
                  )}
                  <Button
                    className="mt-4 w-full rounded-full"
                    onClick={() => askMori(`Help me with my binder "${detail.name}"`)}
                  >
                    Ask Mori
                  </Button>
                </>
              )
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AppShell>
  );
}
