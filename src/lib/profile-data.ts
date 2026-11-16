/** Owner-scoped reads for My Profile and Mori Studio. RLS limits every query to the signed-in collector. */
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import type { Post } from "./posts";

export type Profile = Tables<"profiles">;
export type BinderHighlight = {
  id: string;
  name: string;
  cover: string | null;
  cover_image: string | null;
  is_public: boolean;
};
export type SavedBinder = { id: string; name: string; cover: string | null; count: number };

export type ProfileData = {
  profile: Profile | null;
  posts: Post[];
  binders: BinderHighlight[];
  saved: SavedBinder[];
  counts: { cards: number; memories: number; followers: number; following: number };
  points: number;
  checkIns: string[];
};

const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  const r = await q;
  if (r.error) throw r.error;
  return r.count ?? 0;
};

type PublicBinder = {
  id: string;
  name: string;
  cover_card_id: string | null;
  cards: { id: string; image_url: string | null }[];
};
const isPublicBinder = (v: Json): v is PublicBinder & Json =>
  typeof v === "object" && v !== null && !Array.isArray(v) && typeof v["name"] === "string";

export async function loadProfileData(uid: string): Promise<ProfileData> {
  const head = { count: "exact" as const, head: true };
  const [profile, posts, binders, cards, memories, followers, following, points, checkIns, saved] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("posts")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("binders")
        .select("id, name, is_public, cover_card_id, cover_image")
        .eq("user_id", uid)
        .order("created_at"),
      count(supabase.from("cards").select("id", head).eq("user_id", uid)),
      count(supabase.from("memories").select("id", head).eq("user_id", uid)),
      count(supabase.from("follows").select("follower_id", head).eq("followee_id", uid)),
      count(supabase.from("follows").select("followee_id", head).eq("follower_id", uid)),
      supabase.from("points_events").select("points").eq("user_id", uid),
      supabase
        .from("check_ins")
        .select("day")
        .eq("user_id", uid)
        .order("day", { ascending: false }),
      supabase.from("saved_binders").select("binder_id").eq("user_id", uid),
    ]);
  for (const r of [profile, posts, binders, points, checkIns, saved]) if (r.error) throw r.error;

  const coverIds = (binders.data ?? []).map((b) => b.cover_card_id).filter((x): x is string => !!x);
  const covers = new Map<string, string | null>();
  if (coverIds.length) {
    const r = await supabase.from("cards").select("id, image_url").in("id", coverIds);
    if (r.error) throw r.error;
    for (const c of r.data) covers.set(c.id, c.image_url);
  }

  const savedBinders: SavedBinder[] = [];
  for (const s of saved.data ?? []) {
    const r = await supabase.rpc("read_public_binder" as never, { p_id: s.binder_id } as never);
    const b = r.data as Json | null;
    if (!r.error && b && isPublicBinder(b)) {
      const cover =
        b.cards.find((c) => c.id === b.cover_card_id)?.image_url ?? b.cards[0]?.image_url ?? null;
      savedBinders.push({ id: b.id, name: b.name, cover, count: b.cards.length });
    }
  }

  return {
    profile: profile.data,
    posts: (posts.data ?? []) as Post[],
    binders: (binders.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      is_public: b.is_public,
      cover_image: b.cover_image,
      cover: b.cover_card_id ? (covers.get(b.cover_card_id) ?? null) : null,
    })),
    saved: savedBinders,
    counts: { cards, memories, followers, following },
    points: (points.data ?? []).reduce((n, p) => n + p.points, 0),
    checkIns: (checkIns.data ?? []).map((c) => c.day),
  };
}

/** Today as the database sees it (check_ins.day defaults to current_date, which is UTC). */
export const dbToday = () => new Date().toISOString().slice(0, 10);
