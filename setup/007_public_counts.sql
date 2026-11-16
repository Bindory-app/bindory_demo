-- Bindory demo: real save and follower counts for Search and collector pages.
-- Plain ASCII. Run once in the Supabase SQL Editor after 006.

begin;

-- How many collectors saved a public binder (counts only; who saved it stays private).
create or replace function public.binder_save_count(p_binder uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.saved_binders s
  where s.binder_id = p_binder and exists (select 1 from public.binders b where b.id = p_binder and b.is_public);
$$;
revoke all on function public.binder_save_count(uuid) from public;
grant execute on function public.binder_save_count(uuid) to anon, authenticated;

-- Search's suggested binders, now with saves and the owner's username.
create or replace function public.list_public_binders(p_query text default '') returns jsonb language sql stable security definer set search_path = public as $$
 select coalesce(jsonb_agg(x order by x->>'name'),'[]'::jsonb) from (
  select jsonb_build_object('id',b.id,'name',b.name,'description',b.description,
   'cover',(select c.image_url from public.cards c where c.id=b.cover_card_id and c.user_id=b.user_id),
   'cover_image',b.cover_image,
   'owner',(select p.display_name from public.profiles p where p.id=b.user_id and p.is_public),
   'owner_username',(select p.username from public.profiles p where p.id=b.user_id and p.is_public),
   'is_mine', b.user_id = auth.uid(),
   'saves',public.binder_save_count(b.id),
   'count',(select count(*) from public.binder_cards bc where bc.binder_id=b.id and bc.user_id=b.user_id)) x
  from public.binders b where b.is_public=true and (coalesce(p_query,'')='' or b.name ilike '%'||p_query||'%' or b.description ilike '%'||p_query||'%')
  limit 40) s;
$$;
revoke all on function public.list_public_binders(text) from public;
grant execute on function public.list_public_binders(text) to anon, authenticated;

-- Collectors to explore, now with location and follower counts.
create or replace function public.list_public_collectors(p_query text default '') returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by (x->>'showcase')::boolean desc, x->>'display_name'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'bio', p.bio,
      'location', p.location,
      'showcase', coalesce((p.settings->>'showcase')::boolean, false),
      'followers', (select count(*) from public.follows f where f.followee_id = p.id),
      'binders', (select count(*) from public.binders b where b.user_id = p.id and b.is_public)) x
    from public.profiles p
    where p.is_public and p.username is not null and p.id is distinct from auth.uid()
      and (coalesce(p_query, '') = '' or p.display_name ilike '%' || p_query || '%'
           or p.username ilike '%' || p_query || '%' or p.bio ilike '%' || p_query || '%')
    limit 20) s;
$$;
revoke all on function public.list_public_collectors(text) from public;
grant execute on function public.list_public_collectors(text) to anon, authenticated;

commit;
