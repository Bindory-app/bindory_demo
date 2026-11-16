/** Public collector data: only what collectors have made public, read through security-definer RPCs. */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Post } from "./posts";

export type PublicCollector = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  binders: number;
};

export type PublicBinderTile = {
  id: string;
  name: string;
  cover_image: string | null;
  cover: string | null;
  count: number;
};

export type PublicProfile = PublicCollector & {
  location: string | null;
  collecting_since: number | null;
  is_me: boolean;
  followers: number;
  following: number;
  is_following: boolean;
  binders_list: PublicBinderTile[];
  posts: Post[];
};

const asArray = (v: Json | null): unknown[] => (Array.isArray(v) ? v : []);

export async function listCollectors(query: string): Promise<PublicCollector[]> {
  const { data, error } = await supabase.rpc("list_public_collectors", { p_query: query });
  if (error) throw error;
  return asArray(data) as PublicCollector[];
}

export async function readProfile(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc("read_public_profile", { p_username: username });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, Json>;
  return {
    ...(d as unknown as PublicProfile),
    binders: asArray(d["binders"] ?? null).length,
    binders_list: asArray(d["binders"] ?? null) as PublicBinderTile[],
    posts: asArray(d["posts"] ?? null) as Post[],
  };
}

/** Follow or unfollow. Returns the new state; RLS only allows changing your own follows. */
export async function setFollowing(me: string, them: string, follow: boolean) {
  const { error } = follow
    ? await supabase.from("follows").insert({ follower_id: me, followee_id: them })
    : await supabase.from("follows").delete().eq("follower_id", me).eq("followee_id", them);
  if (error && !(follow && error.code === "23505")) throw error;
  return follow;
}

export async function isFollowing(me: string, them: string) {
  const { count } = await supabase
    .from("follows")
    .select("followee_id", { count: "exact", head: true })
    .eq("follower_id", me)
    .eq("followee_id", them);
  return (count ?? 0) > 0;
}

/** Save or unsave a public binder to your Saved tab. */
export async function setSaved(me: string, binderId: string, save: boolean) {
  const { error } = save
    ? await supabase.from("saved_binders").insert({ user_id: me, binder_id: binderId })
    : await supabase.from("saved_binders").delete().eq("user_id", me).eq("binder_id", binderId);
  if (error && !(save && error.code === "23505")) throw error;
  return save;
}

export async function isSaved(me: string, binderId: string) {
  const { count } = await supabase
    .from("saved_binders")
    .select("binder_id", { count: "exact", head: true })
    .eq("user_id", me)
    .eq("binder_id", binderId);
  return (count ?? 0) > 0;
}

/** Short display numbers: 1200 -> 1.2k. */
export const shortCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
