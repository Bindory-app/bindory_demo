import { useRef, useState } from "react";
import { MoreHorizontal, Plus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tables } from "@/integrations/supabase/types";

type Card = Tables<"cards">;
export function GrailCardMenu({
  card,
  choose,
}: {
  card: Card;
  choose: (card: Card, rank: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Options for ${card.name}`}
          title="Card options"
          className="absolute right-0 top-0 size-6 rounded-full bg-card/90 text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {[1, 2, 3].map((rank) => (
          <DropdownMenuItem key={rank} onSelect={() => choose(card, rank)}>
            Set as grail {rank}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Grails({
  cards,
  photos,
  choose,
  upload,
  saving,
}: {
  cards: Card[];
  photos: Record<string, string>;
  choose: (card: Card, rank: number) => void;
  upload: (card: Card, file: File) => void;
  saving: boolean;
}) {
  const [rank, setRank] = useState<number | null>(null);
  const [photoCard, setPhotoCard] = useState<Card | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-bold">My Grails</h2>
        <span className="text-sm font-bold text-muted-foreground">Top 3</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3" aria-label="Top 3 grail photos">
        {[1, 2, 3].map((slot) => {
          const card = cards.find((card) => card.is_grail && card.grail_rank === slot);
          const src = card?.slab_photo_path ? photos[card.slab_photo_path] : undefined;
          return (
            <div key={slot} className="min-w-0">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() =>
                  card ? (setPhotoCard(card), input.current?.click()) : setRank(slot)
                }
                className={`flex h-[30svh] min-h-40 max-h-72 w-full flex-col gap-2 whitespace-normal p-0 shadow-none hover:bg-transparent ${src || card ? "" : "rounded-2xl border border-dashed border-border bg-secondary/30"}`}
                aria-label={card ? `Add slab photo for ${card.name}` : `Choose grail ${slot}`}
              >
                {src ? (
                  <img
                    src={src}
                    alt={`${card?.name} slab`}
                    className="h-full w-full object-contain"
                  />
                ) : card ? (
                  <SlabFrame card={card} />
                ) : (
                  <>
                    <span className="text-primary">
                      <Plus />
                    </span>
                    <span className="px-1 text-xs font-semibold text-muted-foreground">
                      Choose a grail
                    </span>
                  </>
                )}
              </Button>
              {card && <p className="mt-2 truncate text-center text-sm font-bold">{card.name}</p>}
            </div>
          );
        })}
      </div>
      <input
        hidden
        ref={input}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && photoCard) upload(photoCard, file);
          event.target.value = "";
        }}
      />
      <Dialog.Root
        open={rank !== null}
        onOpenChange={(open) => {
          if (!open) setRank(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 max-h-[75dvh] w-[calc(100%-2rem)] max-w-[358px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-card p-5"
          >
            <Dialog.Title className="pr-8 text-lg font-bold">Choose grail {rank}</Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close grail picker"
                className="absolute right-2 top-2"
              >
                <X />
              </Button>
            </Dialog.Close>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {cards.map((card) => (
                <Button
                  key={card.id}
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    if (rank) choose(card, rank);
                    setRank(null);
                  }}
                  className="h-auto min-w-0 flex-col gap-1 whitespace-normal p-0"
                >
                  {card.image_url && (
                    <img
                      src={card.image_url}
                      alt=""
                      className="aspect-[63/88] w-full rounded-[6px] object-contain"
                    />
                  )}
                  <span className="text-xs">{card.name}</span>
                </Button>
              ))}
            </div>
            {!cards.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No cards in your collection yet.
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/**
 * A drawn slab case around the card art, shown until a real slab photo is uploaded.
 * It carries no grade, so it never claims a card has been graded.
 */
function SlabFrame({ card }: { card: Card }) {
  return (
    <span className="flex h-full w-full flex-col rounded-xl bg-gradient-to-b from-[#3a3f4f] to-[#22252f] p-1.5 shadow-sm">
      <span className="mb-1 block rounded-md border-2 border-[#d9354a] bg-white px-1.5 py-1 text-left leading-tight">
        <span className="block truncate text-[8px] font-bold uppercase text-[#1B2340]">
          {card.name}
        </span>
        <span className="block truncate text-[7px] uppercase text-[#1B2340]/70">
          {[card.year, card.set_name, card.number && `#${card.number}`].filter(Boolean).join(" ")}
        </span>
      </span>
      <span className="flex min-h-0 flex-1 items-center justify-center rounded-md bg-[#15171e] p-1">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="h-full w-full object-contain" />
        ) : null}
      </span>
    </span>
  );
}
