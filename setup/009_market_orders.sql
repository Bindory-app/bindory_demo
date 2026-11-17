-- 009: Buy and sell orders (price alerts) that Mori proposes and the collector confirms.
-- Paste into the Supabase SQL Editor and run. ASCII only (curly quotes are written as U& escapes).

create table if not exists public.market_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  side text not null check (side in ('buy', 'sell')),
  tcgdex_id text not null check (length(tcgdex_id) between 1 and 100),
  card_name text not null check (length(card_name) between 1 and 200),
  image_url text check (image_url is null or length(image_url) <= 500),
  price_usd numeric(12, 2) not null check (price_usd > 0 and price_usd <= 1000000),
  note text check (note is null or length(note) <= 2000),
  status text not null default 'open' check (status in ('open', 'cancelled', 'filled')),
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

alter table public.market_orders enable row level security;
revoke all on public.market_orders from anon;
grant select, insert, update, delete on public.market_orders to authenticated;

drop policy if exists "orders owner select" on public.market_orders;
drop policy if exists "orders owner insert" on public.market_orders;
drop policy if exists "orders owner update" on public.market_orders;
drop policy if exists "orders owner delete" on public.market_orders;
create policy "orders owner select" on public.market_orders for select to authenticated using (user_id = auth.uid());
create policy "orders owner insert" on public.market_orders for insert to authenticated with check (user_id = auth.uid());
create policy "orders owner update" on public.market_orders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "orders owner delete" on public.market_orders for delete to authenticated using (user_id = auth.uid());

-- Same function as before, with one new case: set_order.
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
  reply := U&'Your binder \201C' || (p->>'name') || U&'\201D is ready with ' || pos || ' cards.';
 WHEN 'save_memory' THEN
  IF p->>'photo_path' IS NOT NULL AND split_part(p->>'photo_path','/',1)<>auth.uid()::text THEN RAISE EXCEPTION 'Photo must belong to you'; END IF;
  INSERT INTO public.memories(user_id,title,note,place,with_whom,happened_on,card_tcgdex_id,photo_path,is_private)
  VALUES(auth.uid(),p->>'title',p->>'story',p->>'place',p->>'with_whom',nullif(p->>'date','')::date,p->'card'->>'tcgdex_id',p->>'photo_path',true);
  reply := U&'Saved \201C' || (p->>'title') || U&'\201D as a private memory. +25 points.';
 WHEN 'set_order' THEN
  c := p->'card';
  IF (p->>'side') NOT IN ('buy','sell') OR (p->>'price_usd')::numeric <= 0 THEN RAISE EXCEPTION 'Invalid order'; END IF;
  INSERT INTO public.market_orders(user_id,side,tcgdex_id,card_name,image_url,price_usd,note)
  VALUES(auth.uid(),p->>'side',c->>'tcgdex_id',c->>'name',c->>'image',(p->>'price_usd')::numeric,p->>'note');
  reply := 'Your ' || (p->>'side') || ' order for ' || (c->>'name') || ' at US$' || (p->>'price_usd') || ' is live for 30 days. I will tell you as soon as a matching listing appears.';
 ELSE RAISE EXCEPTION 'Unknown proposal';
 END CASE;
 UPDATE public.mori_messages SET payload=jsonb_set(p,'{status}','"confirmed"') WHERE id=m.id;
 INSERT INTO public.mori_messages(user_id,role,content) VALUES(auth.uid(),'mori',reply) RETURNING * INTO reply_row;
 RETURN jsonb_build_object('done','confirmed','reply',to_jsonb(reply_row));
END; $$;
REVOKE ALL ON FUNCTION public.confirm_mori_proposal(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_mori_proposal(uuid,text,jsonb) TO authenticated;
