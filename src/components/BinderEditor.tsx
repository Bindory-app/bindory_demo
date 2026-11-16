import { useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Pencil,
  Globe,
  Link2,
  ArrowUp,
  ArrowDown,
  X,
  ChevronLeft,
  Check,
  ImageIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BinderCover, BinderPages } from "./BinderPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadOwnedBinder, saveOwnedBinder } from "@/lib/binders.functions";
import type { BinderCard } from "@/lib/binders";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_ART } from "@/lib/posts";

export function BinderEditor({ id, userId }: { id: string; userId: string }) {
  const load = useServerFn(loadOwnedBinder);
  const save = useServerFn(saveOwnedBinder);
  const cache = useQueryClient();
  const key = ["binder", userId, id];
  const { data } = useSuspenseQuery({ queryKey: key, queryFn: () => load({ data: { id } }) });
  const b = data.binder;
  const [mode, setMode] = useState<"edit" | "rename" | "publish" | null>(null);
  const [name, setName] = useState(b.name);
  const [description, setDescription] = useState(b.description ?? "");
  const [draft, setDraft] = useState(b.cards);
  const [cover, setCover] = useState(b.cover_card_id);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [picking, setPicking] = useState(false);
  const setCoverImage = async (image: string) => {
    setBusy(true);
    const { error } = await supabase.from("binders").update({ cover_image: image }).eq("id", id);
    setBusy(false);
    if (error) setNotice("I could not change the cover. Please try again.");
    else {
      await cache.invalidateQueries({ queryKey: key });
      setPicking(false);
    }
  };
  const open = (next: typeof mode) => {
    setName(b.name);
    setDescription(b.description ?? "");
    setDraft(b.cards);
    setCover(b.cover_card_id ?? b.cards[0]?.id ?? null);
    setNotice("");
    setMode(next);
  };
  const persist = async (publish = b.is_public) => {
    setBusy(true);
    setNotice("");
    try {
      await save({
        data: {
          id,
          name,
          description,
          cards: draft,
          cover: draft.some((c) => c.id === cover) ? cover : (draft[0]?.id ?? null),
          isPublic: publish,
          publishConfirmed: publish && (mode === "publish" || b.is_public),
        },
      });
      await cache.invalidateQueries({ queryKey: key });
      setMode(null);
      setNotice(publish ? "Saved. Your binder is public." : "Saved privately.");
    } catch {
      setNotice("I could not save your binder. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const url = `${window.location.origin}/b/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Share link copied.");
    } catch {
      setNotice(url);
    }
  };
  const move = (index: number, direction: number) =>
    setDraft((prev) => {
      const next = [...prev];
      const card = next[index];
      const other = next[index + direction];
      if (!card || !other) return prev;
      next[index] = other;
      next[index + direction] = card;
      return next;
    });
  return (
    <AppShell
      title={b.name}
      collection
      action={
        <Button variant="ghost" size="icon" aria-label="Edit binder" onClick={() => open("edit")}>
          <Pencil />
        </Button>
      }
    >
      <Button asChild variant="ghost" className="mb-4 -ml-3 text-primary">
        <Link to="/collection">
          <ChevronLeft />
          My Collection
        </Link>
      </Button>
      <BinderCover
        cards={b.cards}
        coverId={b.cover_card_id}
        name={b.name}
        coverImage={b.cover_image}
        subtitle={`${b.is_public ? "Public" : "Private"} binder · ${b.cards.length} cards`}
        action={
          b.is_public ? (
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              aria-label="Copy share link"
              onClick={share}
            >
              <Link2 />
            </Button>
          ) : undefined
        }
      />
      {picking && (
        <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {DEMO_ART.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={() => void setCoverImage(a.image)}
              aria-label={`Use ${a.name} as the cover`}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ${b.cover_image === a.image ? "ring-primary" : "ring-transparent"}`}
            >
              <img src={a.image} alt="" className="h-full w-full object-cover" />
              {b.cover_image === a.image && (
                <Check className="absolute inset-0 m-auto size-6 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      )}
      {b.description && (
        <p className="mb-4 text-center text-sm text-muted-foreground">{b.description}</p>
      )}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => setPicking((p) => !p)}>
          <ImageIcon />
          {picking ? "Done" : "Cover art"}
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => open("rename")}>
          <Pencil />
          Rename
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => open("publish")}>
          <Globe />
          {b.is_public ? "Make private" : "Make public"}
        </Button>
        {b.is_public && (
          <Button variant="outline" className="rounded-full" onClick={share}>
            <Link2 />
            Share link
          </Button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {b.cards.length} cards · {b.is_public ? "Public" : "Private"}
      </p>
      <BinderPages cards={b.cards} />
      {notice && (
        <p role="status" className="mt-3 break-all text-sm text-primary">
          {notice}
        </p>
      )}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setMode(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-[350px] overflow-y-auto rounded-3xl">
          <DialogTitle>
            {mode === "publish"
              ? b.is_public
                ? "Make this binder private?"
                : "Make this binder public?"
              : mode === "rename"
                ? "Rename binder"
                : "Edit binder"}
          </DialogTitle>
          <DialogDescription>
            {mode === "publish"
              ? b.is_public
                ? "The shared link will no longer show this binder."
                : "Anyone with the link can see this binder’s cover, cards and reasons. Private memories and slab photos stay private."
              : "Keep the cards and reasons that belong together."}
          </DialogDescription>
          {mode !== "publish" && (
            <label className="text-sm font-semibold">
              Binder name
              <Input
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </label>
          )}
          {mode === "edit" && (
            <>
              <label className="text-sm font-semibold">
                Description
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="text-sm font-semibold">
                Cover
                <select
                  aria-label="Cover card"
                  value={cover ?? ""}
                  onChange={(e) => setCover(e.target.value || null)}
                  className="mt-1 w-full rounded-xl border border-border bg-card p-2"
                >
                  <option value="">First card</option>
                  {draft.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {draft.map((card, index) => (
                <div key={`${card.id}-${index}`} className="border-b border-border pb-3">
                  <div className="flex items-center gap-1">
                    <p className="min-w-0 flex-1 text-sm font-semibold">{card.name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      aria-label={`Move ${card.name} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === draft.length - 1}
                      aria-label={`Move ${card.name} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${card.name}`}
                      onClick={() => setDraft((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X />
                    </Button>
                  </div>
                  <Input
                    aria-label={`Reason for ${card.name}`}
                    value={card.reason ?? ""}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev.map((c, i) => (i === index ? { ...c, reason: e.target.value } : c)),
                      )
                    }
                  />
                </div>
              ))}
              <label className="text-sm font-semibold">
                Add a card
                <select
                  aria-label="Add owned card"
                  value=""
                  onChange={(e) => {
                    const card = data.owned.find((c) => c.id === e.target.value);
                    if (card)
                      setDraft((prev) => [
                        ...prev,
                        { ...card, reason: null, position: prev.length } satisfies BinderCard,
                      ]);
                  }}
                  className="mt-1 w-full rounded-xl border border-border bg-card p-2"
                >
                  <option value="">Choose from your cards</option>
                  {data.owned
                    .filter((c) => !draft.some((d) => d.id === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          {notice && (
            <p role="alert" className="text-sm text-destructive">
              {notice}
            </p>
          )}
          <Button
            disabled={busy || !name.trim()}
            onClick={() => void persist(mode === "publish" ? !b.is_public : b.is_public)}
            className="rounded-full"
          >
            {busy
              ? "Saving…"
              : mode === "publish"
                ? b.is_public
                  ? "Confirm private"
                  : "Confirm publish"
                : "Save"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setMode(null)}
            className="rounded-full"
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
