import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HOME_EVENTS } from "@/lib/home-content";

export function HomeEvents() {
  const [ref, api] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    api.on("select", update);
    return () => { api.off("select", update); };
  }, [api]);
  return <section aria-label="Events" className="mt-4">
    <div ref={ref} className="overflow-hidden rounded-3xl"><div className="flex">
      {HOME_EVENTS.map(event => <div key={event.title} className="min-w-0 flex-[0_0_100%]">
        <Button asChild className={`aspect-[1.77] h-auto w-full flex-col items-start justify-center gap-2 whitespace-normal rounded-3xl px-5 text-left text-banner-foreground shadow-none ${event.theme}`}>
          <Link to={event.to}><span className="text-[10px] font-bold">{event.label}</span><span className="max-w-56 text-2xl font-bold leading-tight">{event.title}</span>{event.to === "/events/anniversary" && <span className="max-w-48 text-xs font-semibold leading-snug">Celebrating the cards, memories and binders collectors share</span>}</Link>
        </Button>
      </div>)}
    </div></div>
    <div className="mt-2 flex justify-center gap-1.5">{HOME_EVENTS.map((event, index) => <Button key={event.title} variant="ghost" aria-label={`Show ${event.title}`} aria-pressed={selected === index} onClick={() => api?.scrollTo(index)} className="h-5 w-5 rounded-full p-0"><span className={`h-1.5 rounded-full ${selected === index ? "w-5 bg-primary" : "w-1.5 bg-border"}`} /></Button>)}</div>
  </section>;
}