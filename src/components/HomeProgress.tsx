import { ArrowUpRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { progressTo } from "@/lib/home-content";

export function HomeProgress({ name, owned, target, images, onClick }: { name: string; owned: number; target: number; images: string[]; onClick: () => void }) {
  const progress = progressTo(owned, target);
  return (
    <Button variant="outline" onClick={onClick} className="h-auto w-64 shrink-0 snap-start flex-col items-stretch gap-0 whitespace-normal rounded-3xl border-border bg-card p-4 text-left shadow-none">
      <div className="flex h-24 items-center justify-center gap-2 rounded-2xl bg-accent">
        {images.length ? images.slice(0, 3).map((image, index) => <img key={`${image}-${index}`} src={image} alt="" className="h-20 w-14 rounded-md object-contain" />) : <Layers className="size-9 text-primary" />}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2"><span className="font-bold">{name}</span><ArrowUpRight className="text-primary" /></div>
      <span className="mt-1 text-xs text-muted-foreground">{progress.remaining ? `${progress.remaining} more to reach ${target}` : `${target} of ${target} collected`}</span>
      <div role="progressbar" aria-label={name} aria-valuenow={progress.count} aria-valuemin={0} aria-valuemax={target} className="mt-3 h-2 overflow-hidden rounded-full bg-accent"><div className="h-full rounded-full bg-brand" style={{ width: `${progress.percent}%` }} /></div>
    </Button>
  );
}