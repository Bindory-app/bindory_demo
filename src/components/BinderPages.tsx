import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { BookHeart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { binderPages, type BinderCard } from "@/lib/binders";

export function BinderCover({
  cards,
  coverId,
  name,
  coverImage,
  subtitle,
  action,
}: {
  cards: BinderCard[];
  coverId?: string | null;
  name: string;
  coverImage?: string | null | undefined;
  subtitle?: string | undefined;
  action?: React.ReactNode;
}) {
  if (coverImage?.startsWith("/demo/"))
    return (
      <div className="relative mb-5 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-foreground">
        <img
          src={coverImage}
          alt={`${name} cover`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-16 text-white">
          <p className="text-2xl font-bold leading-tight">{name}</p>
          {subtitle && <p className="mt-1 text-sm opacity-90">{subtitle}</p>}
        </div>
        {action && <div className="absolute bottom-3 right-3">{action}</div>}
      </div>
    );
  const cover = cards.find((c) => c.id === coverId) ?? cards[0];
  return (
    <div className="relative mx-auto mb-5 grid aspect-[4/3] w-full max-w-64 place-items-center rounded-3xl border border-border bg-secondary p-5">
      {cover?.image_url ? (
        <img
          src={cover.image_url}
          alt={`${name} cover`}
          className="h-full min-h-0 w-full object-contain"
        />
      ) : (
        <BookHeart className="size-16 text-primary" />
      )}
    </div>
  );
}

export function BinderPages({ cards }: { cards: BinderCard[] }) {
  const [ref, api] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState<BinderCard | null>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => setActive(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);
  const pages = binderPages(cards);
  return (
    <>
      <div ref={ref} className="overflow-hidden" aria-label="Binder pages">
        <div className="flex touch-pan-y">
          {pages.map((slots, page) => (
            <section
              key={page}
              aria-label={`Page ${page + 1}`}
              className="min-w-0 flex-[0_0_100%] px-1"
            >
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-secondary p-3">
                {slots.map((card, slot) =>
                  card ? (
                    <Button
                      key={`${card.id}-${slot}`}
                      variant="ghost"
                      onClick={() => setSelected(card)}
                      aria-label={`Why ${card.name}`}
                      className="aspect-[5/7] h-auto min-w-0 rounded-md border border-border bg-card p-1 shadow-none"
                    >
                      {card.image_url ? (
                        <img
                          src={card.image_url}
                          alt={card.name}
                          className="h-full w-full rounded-md object-contain"
                        />
                      ) : (
                        <span className="whitespace-normal text-xs">{card.name}</span>
                      )}
                    </Button>
                  ) : (
                    <div
                      key={slot}
                      className="aspect-[5/7] rounded-md border border-dashed border-border bg-card/50"
                    />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
      <nav
        aria-label="Binder pagination"
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        <Button
          size="icon"
          variant="ghost"
          disabled={active === 0}
          aria-label="Previous page"
          onClick={() => api?.scrollPrev()}
        >
          <ChevronLeft />
        </Button>
        {pages.map((_, page) => (
          <Button
            key={page}
            variant={page === active ? "default" : "outline"}
            aria-current={page === active ? "page" : undefined}
            size="icon"
            aria-label={`Go to page ${page + 1}`}
            onClick={() => api?.scrollTo(page)}
            className="rounded-full"
          >
            {page + 1}
          </Button>
        ))}
        <Button
          size="icon"
          variant="ghost"
          disabled={active === pages.length - 1}
          aria-label="Next page"
          onClick={() => api?.scrollNext()}
        >
          <ChevronRight />
        </Button>
      </nav>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-[350px] rounded-3xl">
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>
            {selected?.reason || "Mori has not added a reason for this card yet."}
          </DialogDescription>
          {selected?.image_url && (
            <img
              src={selected.image_url}
              alt={selected.name}
              className="mx-auto h-60 w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
