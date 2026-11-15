-- Bindory demo: full database setup for a fresh Supabase project.
-- Generated from drizzle/migrations 0000-0008 plus the private memory-photos bucket
-- (Lovable created that bucket outside the migrations). Run once in the SQL Editor.

begin;
insert into storage.buckets (id, name, public) values ('memory-photos', 'memory-photos', false) on conflict (id) do nothing;

-- ===== 0000_bindory_core.sql =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete to authenticated using (auth.uid() = id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  tcgdex_id text not null,
  name text not null,
  set_name text,
  number text,
  image_url text,
  created_at timestamptz not null default now()
);
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  note text,
  happened_on date,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table public.binder_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  binder_id uuid not null references public.binders(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table public.mori_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  role text not null check (role in ('user','mori')),
  content text not null,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['cards','memories','binders','binder_cards','mori_messages'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== 0001_profile_onboarding.sql =====
alter table public.profiles add column onboarding_answers jsonb, add column onboarded_at timestamptz;

-- ===== 0002_mori_agent.sql =====
alter table public.mori_messages add column kind text not null default 'text', add column payload jsonb;
alter table public.cards add column set_id text, add column illustrator text, add column rarity text, add column year int;
alter table public.memories add column place text, add column with_whom text, add column card_tcgdex_id text, add column photo_path text;
alter table public.binder_cards add column reason text;
alter table public.binders add column description text;

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  tcgdex_id text not null,
  name text not null,
  image_url text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.wishlist to authenticated;
grant all on public.wishlist to service_role;
alter table public.wishlist enable row level security;
create policy "own select" on public.wishlist for select to authenticated using (auth.uid() = user_id);
create policy "own insert" on public.wishlist for insert to authenticated with check (auth.uid() = user_id);
create policy "own update" on public.wishlist for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.wishlist for delete to authenticated using (auth.uid() = user_id);

create table public.points_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  points int not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.points_events to authenticated;
grant all on public.points_events to service_role;
alter table public.points_events enable row level security;
create policy "own select" on public.points_events for select to authenticated using (auth.uid() = user_id);

create or replace function public.award_points()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.points_events (user_id, kind, points, ref_id)
  values (new.user_id,
          case when tg_table_name = 'cards' then 'card_added' else 'memory_saved' end,
          case when tg_table_name = 'cards' then 10 else 25 end,
          new.id);
  return new;
end $$;
create trigger award_points_cards after insert on public.cards for each row execute function public.award_points();
create trigger award_points_memories after insert on public.memories for each row execute function public.award_points();

-- ===== 0003_memory_photos_policies.sql =====
create policy "own memory photos select" on storage.objects for select to authenticated using (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own memory photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own memory photos delete" on storage.objects for delete to authenticated using (bucket_id = 'memory-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 0004_atomic_mori_confirmation.sql =====
CREATE OR REPLACE FUNCTION public.confirm_mori_proposal(p_message_id uuid, p_action text, p_card_details jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE m public.mori_messages%ROWTYPE; p jsonb; c jsonb; card_row_id uuid; binder_id uuid; reply text; reply_row public.mori_messages%ROWTYPE; pos integer := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p_action NOT IN ('confirm','edit') THEN RAISE EXCEPTION 'Invalid action'; END IF;
 SELECT * INTO m FROM public.mori_messages WHERE id=p_message_id AND user_id=auth.uid() AND kind='confirm' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Confirmation not found'; END IF;
 p := m.payload;
 IF p->>'status' <> 'pending' THEN RAISE EXCEPTION 'This proposal was already handled'; END IF;
 IF p_action='edit' THEN
  UPDATE public.mori_messages SET payload=jsonb_set(p,'{status}','"edited"') WHERE id=m.id;
  RETURN jsonb_build_object('done','edited','reply',NULL);
 END IF;
 CASE p->>'tool'
 WHEN 'add_card_to_collection' THEN
  c := p->'card';
  IF p_card_details IS NULL OR p_card_details->>'tcgdex_id' IS DISTINCT FROM c->>'tcgdex_id' THEN RAISE EXCEPTION 'Card details missing'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || (c->>'tcgdex_id'),0));
  SELECT id INTO card_row_id FROM public.cards WHERE user_id=auth.uid() AND tcgdex_id=c->>'tcgdex_id' LIMIT 1;
  IF card_row_id IS NULL THEN
   INSERT INTO public.cards(user_id,tcgdex_id,name,set_name,set_id,number,image_url,illustrator,rarity,year)
   VALUES(auth.uid(),p_card_details->>'tcgdex_id',p_card_details->>'name',p_card_details->>'set_name',p_card_details->>'set_id',p_card_details->>'number',p_card_details->>'image_url',p_card_details->>'illustrator',p_card_details->>'rarity',(p_card_details->>'year')::integer);
   reply := (p_card_details->>'name') || ' is in your collection now. +10 points.';
  ELSE reply := (c->>'name') || ' was already in your collection.'; END IF;
 WHEN 'add_to_wishlist' THEN
  c := p->'card';
  INSERT INTO public.wishlist(user_id,tcgdex_id,name,image_url,note) VALUES(auth.uid(),c->>'tcgdex_id',c->>'name',c->>'image',p->>'note');
  reply := (c->>'name') || ' is on your wishlist.';
 WHEN 'create_binder' THEN
  IF jsonb_array_length(p->'cards')=0 THEN RAISE EXCEPTION 'Choose cards first'; END IF;
  INSERT INTO public.binders(user_id,name,description) VALUES(auth.uid(),p->>'name',p->>'description') RETURNING id INTO binder_id;
  FOR c IN SELECT value FROM jsonb_array_elements(p->'cards') LOOP
   SELECT id INTO card_row_id FROM public.cards WHERE user_id=auth.uid() AND tcgdex_id=c->>'tcgdex_id' LIMIT 1;
   IF card_row_id IS NULL THEN RAISE EXCEPTION 'A binder can only include cards you own'; END IF;
   IF nullif(trim(c->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Every card needs a reason'; END IF;
   INSERT INTO public.binder_cards(user_id,binder_id,card_id,position,reason) VALUES(auth.uid(),binder_id,card_row_id,pos,c->>'reason');
   pos := pos+1;
  END LOOP;
  reply := 'Your binder “' || (p->>'name') || '” is ready with ' || pos || ' cards.';
 WHEN 'save_memory' THEN
  IF p->>'photo_path' IS NOT NULL AND split_part(p->>'photo_path','/',1)<>auth.uid()::text THEN RAISE EXCEPTION 'Photo must belong to you'; END IF;
  INSERT INTO public.memories(user_id,title,note,place,with_whom,happened_on,card_tcgdex_id,photo_path,is_private)
  VALUES(auth.uid(),p->>'title',p->>'story',p->>'place',p->>'with_whom',nullif(p->>'date','')::date,p->'card'->>'tcgdex_id',p->>'photo_path',true);
  reply := 'Saved “' || (p->>'title') || '” as a private memory. +25 points.';
 ELSE RAISE EXCEPTION 'Unknown proposal';
 END CASE;
 UPDATE public.mori_messages SET payload=jsonb_set(p,'{status}','"confirmed"') WHERE id=m.id;
 INSERT INTO public.mori_messages(user_id,role,content) VALUES(auth.uid(),'mori',reply) RETURNING * INTO reply_row;
 RETURN jsonb_build_object('done','confirmed','reply',to_jsonb(reply_row));
END; $$;
REVOKE ALL ON FUNCTION public.confirm_mori_proposal(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_mori_proposal(uuid,text,jsonb) TO authenticated;

-- ===== 0005_enforce_private_memory_photo_folders.sql =====
CREATE POLICY "memory photos owner select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "memory photos owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "memory photos owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "memory photos owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 0006_collection_grail_selection.sql =====
ALTER TABLE public.cards ADD COLUMN is_grail boolean NOT NULL DEFAULT false, ADD COLUMN grail_rank integer, ADD COLUMN slab_photo_path text;
ALTER TABLE public.cards ADD CONSTRAINT cards_grail_rank_check CHECK ((is_grail AND grail_rank BETWEEN 1 AND 3) OR (NOT is_grail AND grail_rank IS NULL));
CREATE UNIQUE INDEX cards_owner_grail_rank ON public.cards(user_id,grail_rank) WHERE is_grail;
CREATE OR REPLACE VIEW public.user_cards WITH (security_invoker=true) AS SELECT * FROM public.cards;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_cards TO authenticated;
GRANT ALL ON public.user_cards TO service_role;
CREATE FUNCTION public.set_card_grail(p_card_id uuid,p_rank integer) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p_rank NOT BETWEEN 1 AND 3 OR p_rank IS NULL THEN RAISE EXCEPTION 'Choose grail 1, 2 or 3'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':grails',0));
 IF NOT EXISTS(SELECT 1 FROM public.cards WHERE id=p_card_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Choose a card you own'; END IF;
 UPDATE public.cards SET is_grail=false,grail_rank=NULL WHERE user_id=auth.uid() AND (grail_rank=p_rank OR id=p_card_id);
 UPDATE public.cards SET is_grail=true,grail_rank=p_rank WHERE id=p_card_id AND user_id=auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.set_card_grail(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_card_grail(uuid,integer) TO authenticated;
ALTER TABLE public.cards ADD CONSTRAINT cards_slab_photo_owner CHECK (slab_photo_path IS NULL OR (split_part(slab_photo_path,'/',1)=user_id::text AND position('..' in slab_photo_path)=0));

-- ===== 0007_binder_detail_public_sharing.sql =====
ALTER TABLE public.binders ADD COLUMN is_public boolean NOT NULL DEFAULT false, ADD COLUMN cover_card_id uuid REFERENCES public.cards(id);
CREATE OR REPLACE FUNCTION public.read_public_binder(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('id',b.id,'name',b.name,'description',b.description,'is_public',b.is_public,'cover_card_id',b.cover_card_id,'cards',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'image_url',c.image_url,'reason',bc.reason,'position',bc.position) ORDER BY bc.position,bc.id) FROM public.binder_cards bc JOIN public.cards c ON c.id=bc.card_id AND c.user_id=b.user_id WHERE bc.binder_id=b.id AND bc.user_id=b.user_id),'[]'::jsonb)) FROM public.binders b WHERE b.id=p_id AND b.is_public=true;
$$;
REVOKE ALL ON FUNCTION public.read_public_binder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_binder(uuid) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.save_binder_detail(p_id uuid,p_name text,p_description text,p_cover uuid,p_public boolean,p_cards jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE c jsonb; pos integer:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 PERFORM 1 FROM public.binders WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Binder not found'; END IF;
 IF length(trim(p_name))=0 OR length(p_name)>120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
 IF jsonb_typeof(p_cards)<>'array' OR jsonb_array_length(p_cards)>500 THEN RAISE EXCEPTION 'Invalid cards'; END IF;
 IF p_cover IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_cards) v WHERE (v->>'id')::uuid=p_cover) THEN RAISE EXCEPTION 'Cover must be in this binder'; END IF;
 DELETE FROM public.binder_cards WHERE binder_id=p_id AND user_id=auth.uid();
 FOR c IN SELECT value FROM jsonb_array_elements(p_cards) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.cards WHERE id=(c->>'id')::uuid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Choose your own cards'; END IF;
  INSERT INTO public.binder_cards(user_id,binder_id,card_id,position,reason) VALUES(auth.uid(),p_id,(c->>'id')::uuid,pos,c->>'reason');
  pos:=pos+1;
 END LOOP;
 UPDATE public.binders SET name=trim(p_name),description=p_description,cover_card_id=p_cover,is_public=p_public WHERE id=p_id AND user_id=auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.save_binder_detail(uuid,text,text,uuid,boolean,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_binder_detail(uuid,text,text,uuid,boolean,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.confirm_binder_preview(p_message uuid,p_name text,p_publish boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE m public.mori_messages%ROWTYPE; c jsonb; bid uuid; cid uuid; cover uuid; pos integer:=0; r public.mori_messages%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT * INTO m FROM public.mori_messages WHERE id=p_message AND user_id=auth.uid() AND kind='confirm' FOR UPDATE;
 IF NOT FOUND OR m.payload->>'tool'<>'create_binder' OR m.payload->>'status'<>'pending' THEN RAISE EXCEPTION 'Pending binder not found'; END IF;
 IF length(trim(p_name))=0 OR length(p_name)>120 THEN RAISE EXCEPTION 'Invalid name'; END IF;
 IF jsonb_array_length(m.payload->'cards')=0 THEN RAISE EXCEPTION 'Choose cards first'; END IF;
 INSERT INTO public.binders(user_id,name,description,is_public) VALUES(auth.uid(),trim(p_name),m.payload->>'description',p_publish) RETURNING id INTO bid;
 FOR c IN SELECT value FROM jsonb_array_elements(m.payload->'cards') LOOP
  SELECT id INTO cid FROM public.cards WHERE user_id=auth.uid() AND tcgdex_id=c->>'tcgdex_id' ORDER BY created_at,id LIMIT 1;
  IF cid IS NULL THEN RAISE EXCEPTION 'Choose your own cards'; END IF;
  IF nullif(trim(c->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Every card needs a reason'; END IF;
  IF pos=0 THEN cover:=cid; END IF;
  INSERT INTO public.binder_cards(user_id,binder_id,card_id,position,reason) VALUES(auth.uid(),bid,cid,pos,c->>'reason'); pos:=pos+1;
 END LOOP;
 UPDATE public.binders SET cover_card_id=cover WHERE id=bid;
 UPDATE public.mori_messages SET payload=m.payload || jsonb_build_object('status','confirmed','name',trim(p_name),'binder_id',bid) WHERE id=m.id;
 INSERT INTO public.mori_messages(user_id,role,content) VALUES(auth.uid(),'mori','Your binder “'||trim(p_name)||'” is ready'||CASE WHEN p_publish THEN ' and public.' ELSE ' and private.' END) RETURNING * INTO r;
 RETURN jsonb_build_object('done','confirmed','binder_id',bid,'reply',to_jsonb(r));
END; $$;
REVOKE ALL ON FUNCTION public.confirm_binder_preview(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_binder_preview(uuid,text,boolean) TO authenticated;

-- ===== 0008_list_public_binders.sql =====
CREATE OR REPLACE FUNCTION public.list_public_binders(p_query text DEFAULT '') RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT COALESCE(jsonb_agg(x ORDER BY x->>'name'),'[]'::jsonb) FROM (
  SELECT jsonb_build_object('id',b.id,'name',b.name,'description',b.description,
   'cover',(SELECT c.image_url FROM public.cards c WHERE c.id=b.cover_card_id AND c.user_id=b.user_id),
   'count',(SELECT count(*) FROM public.binder_cards bc WHERE bc.binder_id=b.id AND bc.user_id=b.user_id)) x
  FROM public.binders b WHERE b.is_public=true AND (coalesce(p_query,'')='' OR b.name ILIKE '%'||p_query||'%' OR b.description ILIKE '%'||p_query||'%')
  LIMIT 20) s;
$$;
REVOKE ALL ON FUNCTION public.list_public_binders(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_binders(text) TO anon, authenticated;
commit;
