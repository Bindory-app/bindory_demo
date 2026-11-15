import { Button } from "@/components/ui/button";
import { progressTo } from "@/lib/home-content";

export function HomeProgress({ name, owned, target, onClick }: { name: string; owned: number; target: number; onClick: () => void }) {
  const progress = progressTo(owned, target);
  return (
    <Button onClick={onClick} className="bg-collection-progress h-[106px] w-[234px] shrink-0 snap-start justify-start gap-3 whitespace-normal rounded-3xl border-0 px-4 text-left text-banner-foreground shadow-none">
      <div role="progressbar" aria-label={name} aria-valuenow={progress.count} aria-valuemin={0} aria-valuemax={target} className="relative h-[74px] w-[74px] shrink-0">
        <svg viewBox="0 0 80 80" className="absolute inset-0 size-full! -rotate-90" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="var(--progress-track)" strokeWidth="8" /><circle cx="40" cy="40" r="34" fill="none" stroke="var(--progress-highlight)" strokeWidth="8" pathLength="100" strokeDasharray={`${progress.percent} 100`} /></svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold leading-none">{progress.count}</span><span className="mt-0.5 text-[10px]">/{target}</span></span>
      </div>
      <span className="min-w-0"><span className="block text-base font-bold leading-tight">{name}</span><span className="mt-1 block text-xs leading-snug">{progress.remaining ? `${progress.remaining} more to reach ${target} cards` : `${target} of ${target} collected`}</span></span>
    </Button>
  );
}