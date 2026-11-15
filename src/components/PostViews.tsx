import { useEffect, useState } from "react";
import { Image as ImageIcon, MapPin, Pause, Play } from "lucide-react";
import {
  coverBody,
  postThumb,
  recapBody,
  storyBody,
  videoBody,
  type CoverBody,
  type Post,
  type RecapBody,
  type StoryBody,
  type VideoBody,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

/** Small Mori face marking anything made with Mori. */
export function MoriBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-card ring-2 ring-card",
        className,
      )}
      title="Made with Mori"
    >
      <img src="/mori-face.png" alt="Made with Mori" className="h-full w-full object-contain" />
    </span>
  );
}

/** A Mori-made video: frames play one after another with a slow pan and the frame's line of text. */
export function VideoPlayer({
  body,
  title,
  autoPlay = true,
  className = "",
}: {
  body: VideoBody;
  title?: string | undefined;
  autoPlay?: boolean;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const n = body.frames.length;
  useEffect(() => {
    if (!playing || n < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), 3000);
    return () => clearTimeout(t);
  }, [playing, i, n]);
  const f = body.frames[i];
  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-foreground",
        className,
      )}
    >
      {f && (
        <img
          key={`${i}-${f.image}`}
          src={f.image}
          alt=""
          className="animate-mori-pan absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <div className="absolute left-3 right-3 top-3 flex gap-1">
        {body.frames.map((_, k) => (
          <span
            key={k}
            className={`h-1 flex-1 rounded-full ${k <= i ? "bg-white" : "bg-white/35"}`}
          />
        ))}
      </div>
      <MoriBadge className="absolute right-3 top-6" />
      <div className="absolute bottom-4 left-4 right-14 text-white">
        {title && <p className="text-xs font-bold uppercase tracking-wider opacity-80">{title}</p>}
        <p className="mt-1 text-2xl font-bold leading-tight">{f?.text}</p>
      </div>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Play"}
        className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#1B2340]"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    </div>
  );
}

/** A shareable story card: the collector's words in Mori's layout. */
export function StoryCardView({ body }: { body: StoryBody }) {
  return (
    <div className="rounded-3xl bg-brand p-1.5">
      <div className="overflow-hidden rounded-[22px] bg-card">
        {body.image && (
          <div className="bg-muted p-4">
            <img
              src={body.image}
              alt=""
              className="mx-auto max-h-64 w-auto rounded-lg object-contain"
            />
          </div>
        )}
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            A story to tell
          </p>
          <h3 className="mt-1 text-xl font-bold">{body.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body.text}</p>
          {(body.place || body.date) && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MapPin className="size-3.5" />
              {[body.place, body.date].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs font-bold text-primary">
            <MoriBadge className="h-6 w-6" />
            Made with Mori · Bindory
          </div>
        </div>
      </div>
    </div>
  );
}

/** A collection recap: a few numbers and a strip of cards. */
export function RecapView({ body }: { body: RecapBody }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-collection-progress p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-80">Collection recap</p>
      <h3 className="mt-1 text-2xl font-bold">{body.title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {body.stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/15 p-3">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs opacity-85">{s.label}</p>
          </div>
        ))}
      </div>
      {body.images.length > 0 && (
        <div className="mt-4 flex -space-x-6">
          {body.images.map((src, k) => (
            <img
              key={k}
              src={src}
              alt=""
              className="h-24 w-auto rounded-md object-contain shadow-lg"
              style={{ transform: `rotate(${(k - 2) * 4}deg)` }}
            />
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs font-bold">
        <MoriBadge className="h-6 w-6" />
        Made with Mori · Bindory
      </div>
    </div>
  );
}

/** A binder cover: artwork with the binder's name set over it. */
export function CoverView({ body }: { body: CoverBody }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-foreground">
      {body.image && (
        <img src={body.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute bottom-5 left-5 right-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-85">
          {body.subtitle || "Binder"}
        </p>
        <p className="mt-1 text-3xl font-bold leading-tight">{body.title}</p>
      </div>
      <MoriBadge className="absolute right-4 top-4" />
    </div>
  );
}

/** Full view of any post. */
export function PostFull({ post }: { post: Post }) {
  if (post.kind === "video")
    return <VideoPlayer body={videoBody(post.body)} title={post.caption ?? undefined} />;
  if (post.kind === "story_card") return <StoryCardView body={storyBody(post.body)} />;
  if (post.kind === "recap") return <RecapView body={recapBody(post.body)} />;
  if (post.kind === "cover") return <CoverView body={coverBody(post.body)} />;
  const src = postThumb(post);
  return src ? (
    <img
      src={src}
      alt={post.caption ?? ""}
      className="max-h-[70vh] w-full rounded-3xl object-contain"
    />
  ) : null;
}

/** Grid thumbnail; reels use 9:16, everything else is square. */
export function PostTile({
  post,
  reel = false,
  onOpen,
}: {
  post: Post;
  reel?: boolean;
  onOpen: () => void;
}) {
  const src = postThumb(post);
  const card = src.startsWith("https://assets.tcgdex.net/");
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={post.caption ?? "Open post"}
      className={`relative w-full overflow-hidden bg-muted ${reel ? "aspect-[9/16]" : "aspect-square"}`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${card && !reel ? "object-cover object-top" : "object-cover"}`}
        />
      ) : (
        <ImageIcon className="mx-auto size-6 text-muted-foreground" />
      )}
      {post.kind === "video" && (
        <Play className="absolute right-2 top-2 size-5 fill-white text-white drop-shadow" />
      )}
      {post.made_with_mori && reel && <MoriBadge className="absolute right-2 top-2 h-8 w-8" />}
    </button>
  );
}
