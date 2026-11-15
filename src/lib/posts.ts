/** Post shapes stored in public.posts.body. Every image is a TCGdex hotlink or a bundled /demo/ asset. */
import type { Json } from "@/integrations/supabase/types";

export type PostKind = "post" | "video" | "story_card" | "recap" | "cover";

export type Frame = { image: string; text: string };
export type VideoBody = { style?: string; frames: Frame[] };
export type StoryBody = {
  title: string;
  text: string;
  image?: string;
  place?: string;
  date?: string;
};
export type RecapBody = {
  title: string;
  stats: { label: string; value: string }[];
  images: string[];
};
export type CoverBody = { title: string; image: string; subtitle?: string };

export type Post = {
  id: string;
  kind: string;
  caption: string | null;
  media_url: string | null;
  body: Json;
  made_with_mori: boolean;
  is_public: boolean;
  created_at: string;
};

const isObj = (v: unknown): v is { [key: string]: Json | undefined } =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Allowed image sources: TCGdex card art or the app's own demo artwork. */
export const safeImage = (v: unknown): string =>
  typeof v === "string" && (v.startsWith("/demo/") || v.startsWith("https://assets.tcgdex.net/"))
    ? v
    : "";

export function videoBody(body: Json): VideoBody {
  const b = isObj(body) ? body : {};
  const frames = Array.isArray(b["frames"]) ? b["frames"] : [];
  return {
    style: str(b["style"]),
    frames: frames
      .filter(isObj)
      .map((f) => ({ image: safeImage(f["image"]), text: str(f["text"]) }))
      .filter((f) => f.image),
  };
}

export function storyBody(body: Json): StoryBody {
  const b = isObj(body) ? body : {};
  return {
    title: str(b["title"]),
    text: str(b["text"]),
    image: safeImage(b["image"]),
    place: str(b["place"]),
    date: str(b["date"]),
  };
}

export function recapBody(body: Json): RecapBody {
  const b = isObj(body) ? body : {};
  const stats = Array.isArray(b["stats"]) ? b["stats"] : [];
  const images = Array.isArray(b["images"]) ? b["images"] : [];
  return {
    title: str(b["title"]),
    stats: stats.filter(isObj).map((s) => ({ label: str(s["label"]), value: str(s["value"]) })),
    images: images.map(safeImage).filter(Boolean).slice(0, 6),
  };
}

export function coverBody(body: Json): CoverBody {
  const b = isObj(body) ? body : {};
  return { title: str(b["title"]), image: safeImage(b["image"]), subtitle: str(b["subtitle"]) };
}

/** The image that represents a post in a grid. */
export function postThumb(p: Pick<Post, "kind" | "media_url" | "body">): string {
  if (p.media_url) return safeImage(p.media_url);
  if (p.kind === "video") return videoBody(p.body).frames[0]?.image ?? "";
  if (p.kind === "story_card") return storyBody(p.body).image ?? "";
  if (p.kind === "recap") return recapBody(p.body).images[0] ?? "";
  if (p.kind === "cover") return coverBody(p.body).image;
  return "";
}

/** Original artwork bundled with the demo, used for covers and video backdrops. */
export const DEMO_ART = [
  { id: "celestial", name: "Celestial", image: "/demo/cover-celestial.jpg" },
  { id: "moonlight", name: "Moonlight", image: "/demo/cover-moonlight.jpg" },
  { id: "moonmoments", name: "Moon moments", image: "/demo/cover-moonmoments.jpg" },
  { id: "nightgallery", name: "Night gallery", image: "/demo/cover-nightgallery.jpg" },
  { id: "softstudio", name: "Soft studio", image: "/demo/cover-softstudio.jpg" },
  { id: "pinkpoke", name: "Pink", image: "/demo/cover-pinkpoke.jpg" },
  { id: "neodreams", name: "Neo dreams", image: "/demo/cover-neodreams.jpg" },
  { id: "retro", name: "Retro", image: "/demo/cover-retro.jpg" },
  { id: "classicblue", name: "Classic blue", image: "/demo/cover-classicblue.jpg" },
  { id: "sketches", name: "Sketches", image: "/demo/cover-sketches.jpg" },
] as const;
