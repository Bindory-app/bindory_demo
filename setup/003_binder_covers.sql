-- Bindory demo: artwork covers for binders.
-- Run once in the Supabase SQL Editor after 002_profile_studio_create.sql.

begin;

-- Cover artwork bundled with the app (public/demo). Card covers (cover_card_id) still work as a fallback.
alter table public.binders
  add column cover_image text
  check (cover_image is null or cover_image ~ '^/demo/[a-z0-9-]+\.jpg$');

-- Public binder page: same data as before, plus the artwork cover.
create or replace function public.read_public_binder(p_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('id',b.id,'name',b.name,'description',b.description,'is_public',b.is_public,'cover_card_id',b.cover_card_id,'cover_image',b.cover_image,
  'owner',(select coalesce(p.display_name,'A collector') from public.profiles p where p.id=b.user_id and p.is_public),
  'cards',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'image_url',c.image_url,'reason',bc.reason,'position',bc.position) order by bc.position,bc.id) from public.binder_cards bc join public.cards c on c.id=bc.card_id and c.user_id=b.user_id where bc.binder_id=b.id and bc.user_id=b.user_id),'[]'::jsonb))
 from public.binders b where b.id=p_id and b.is_public=true;
$$;
revoke all on function public.read_public_binder(uuid) from public;
grant execute on function public.read_public_binder(uuid) to anon, authenticated;

-- Search's suggested binders: adds the artwork cover and the owner's name (only for public profiles).
create or replace function public.list_public_binders(p_query text default '') returns jsonb language sql stable security definer set search_path = public as $$
 select coalesce(jsonb_agg(x order by x->>'name'),'[]'::jsonb) from (
  select jsonb_build_object('id',b.id,'name',b.name,'description',b.description,
   'cover',(select c.image_url from public.cards c where c.id=b.cover_card_id and c.user_id=b.user_id),
   'cover_image',b.cover_image,
   'owner',(select p.display_name from public.profiles p where p.id=b.user_id and p.is_public),
   'count',(select count(*) from public.binder_cards bc where bc.binder_id=b.id and bc.user_id=b.user_id)) x
  from public.binders b where b.is_public=true and (coalesce(p_query,'')='' or b.name ilike '%'||p_query||'%' or b.description ilike '%'||p_query||'%')
  limit 20) s;
$$;
revoke all on function public.list_public_binders(text) from public;
grant execute on function public.list_public_binders(text) to anon, authenticated;

-- Future demo loads get artwork covers too.
create or replace function public.load_demo_collection(p_profile boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  moon uuid; j151 uuid; fav uuid;
  r record; pos int;
  n_cards int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.profiles where id = uid and settings ? 'demo_loaded') then
    raise exception 'The demo collection is already loaded';
  end if;

  insert into public.cards (user_id, tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url, created_at)
  select uid, v.*, now() - (row_number() over () * interval '3 days')
  from (values
    ('swsh7-215','Umbreon VMAX','Evolving Skies','swsh7','215','KEIICHIRO ITO','Secret Rare',2021,'https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp'),
    ('swsh7-65','Espeon VMAX','Evolving Skies','swsh7','65','5ban Graphics','Holo Rare VMAX',2021,'https://assets.tcgdex.net/en/swsh/swsh7/65/high.webp'),
    ('swsh12.5-062','Lunatone','Crown Zenith','swsh12.5','062','Narumi Sato','Uncommon',2023,'https://assets.tcgdex.net/en/swsh/swsh12.5/062/high.webp'),
    ('swsh6-64','Cresselia','Chilling Reign','swsh6','64','Tika Matsuno','Holo Rare',2021,'https://assets.tcgdex.net/en/swsh/swsh6/64/high.webp'),
    ('swsh8-157','Gengar VMAX','Fusion Strike','swsh8','157','5ban Graphics','Holo Rare VMAX',2021,'https://assets.tcgdex.net/en/swsh/swsh8/157/high.webp'),
    ('swsh8-271','Gengar VMAX','Fusion Strike','swsh8','271','sowsow','Secret Rare',2021,'https://assets.tcgdex.net/en/swsh/swsh8/271/high.webp'),
    ('swsh12-186','Lugia V','Silver Tempest','swsh12','186','kawayoo','Ultra Rare',2022,'https://assets.tcgdex.net/en/swsh/swsh12/186/high.webp'),
    ('sv08.5-161','Umbreon ex','Prismatic Evolutions','sv08.5','161','YASHIRO Nanaco','Special illustration rare',2025,'https://assets.tcgdex.net/en/sv/sv08.5/161/high.webp'),
    ('swsh7-74','Sylveon V','Evolving Skies','swsh7','74','aky CG Works','Holo Rare V',2021,'https://assets.tcgdex.net/en/swsh/swsh7/74/high.webp'),
    ('swsh7-175','Glaceon V','Evolving Skies','swsh7','175','Narumi Sato','Ultra Rare',2021,'https://assets.tcgdex.net/en/swsh/swsh7/175/high.webp'),
    ('swsh7-167','Leafeon V','Evolving Skies','swsh7','167','You Iribi','Ultra Rare',2021,'https://assets.tcgdex.net/en/swsh/swsh7/167/high.webp'),
    ('swsh7-18','Flareon VMAX','Evolving Skies','swsh7','18','5ban Graphics','Holo Rare VMAX',2021,'https://assets.tcgdex.net/en/swsh/swsh7/18/high.webp'),
    ('swsh7-30','Vaporeon VMAX','Evolving Skies','swsh7','30','5ban Graphics','Holo Rare VMAX',2021,'https://assets.tcgdex.net/en/swsh/swsh7/30/high.webp'),
    ('sv03.5-151','Mew ex','151','sv03.5','151','aky CG Works','Double rare',2023,'https://assets.tcgdex.net/en/sv/sv03.5/151/high.webp'),
    ('sv03.5-006','Charizard ex','151','sv03.5','006','PLANETA Mochizuki','Double rare',2023,'https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp'),
    ('sv03.5-001','Bulbasaur','151','sv03.5','001','Yuu Nishida','Common',2023,'https://assets.tcgdex.net/en/sv/sv03.5/001/high.webp'),
    ('swsh9-018','Charizard VSTAR','Brilliant Stars','swsh9','018','5ban Graphics','Holo Rare VSTAR',2022,'https://assets.tcgdex.net/en/swsh/swsh9/018/high.webp'),
    ('swsh12-138','Lugia V','Silver Tempest','swsh12','138','Mitsuhiro Arita','Holo Rare V',2022,'https://assets.tcgdex.net/en/swsh/swsh12/138/high.webp'),
    ('sv06.5-071','Cresselia','Shrouded Fable','sv06.5','071','satoma','Illustration rare',2024,'https://assets.tcgdex.net/en/sv/sv06.5/071/high.webp'),
    ('hgss2-5','Mismagius','Unleashed','hgss2','5','Hideaki Hakozaki','Holo Rare',2010,'https://assets.tcgdex.net/en/hgss/hgss2/5/high.webp'),
    ('swsh3.5-38','Absol','Champion''s Path','swsh3.5','38','kodama','Uncommon',2020,'https://assets.tcgdex.net/en/swsh/swsh3.5/38/high.webp'),
    ('swsh7-212','Sylveon VMAX','Evolving Skies','swsh7','212','Taira Akitsu','Secret Rare',2021,'https://assets.tcgdex.net/en/swsh/swsh7/212/high.webp')
  ) as v(tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url)
  where not exists (select 1 from public.cards c where c.user_id = uid and c.tcgdex_id = v.tcgdex_id);
  get diagnostics n_cards = row_count;

  insert into public.binders (user_id, name, description, is_public, cover_image)
    values (uid, 'Moonlight Pokémon', 'Night sky artwork, Psychic and Darkness types, and the league night trade.', true, '/demo/cover-moonlight.jpg')
    returning id into moon;
  insert into public.binders (user_id, name, description, is_public, cover_image)
    values (uid, '151 Journey', 'Working through the original 151, one page at a time.', true, '/demo/cover-151j.jpg')
    returning id into j151;
  insert into public.binders (user_id, name, description, is_public, cover_image)
    values (uid, 'Favourite artworks', 'Illustrations I still stop and stare at.', false, '/demo/cover-fav.jpg')
    returning id into fav;

  pos := 0;
  for r in select c.id, c.tcgdex_id from public.cards c
           where c.user_id = uid and c.tcgdex_id in ('swsh7-215','sv08.5-161','swsh8-271','swsh12.5-062','swsh6-64','sv06.5-071','hgss2-5','swsh3.5-38','swsh12-186')
           order by array_position(array['swsh7-215','sv08.5-161','swsh8-271','swsh12.5-062','swsh6-64','sv06.5-071','hgss2-5','swsh3.5-38','swsh12-186'], c.tcgdex_id) loop
    insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
    values (uid, moon, r.id, pos, case r.tcgdex_id
      when 'swsh7-215' then 'The league night trade, under a full moon.'
      when 'sv08.5-161' then 'Its night palette suits this binder.'
      when 'swsh8-271' then 'Shadows and a moonlit sky.'
      when 'swsh12.5-062' then 'Lunatone is the moon itself.'
      when 'swsh6-64' then 'Cresselia, the lunar Pokémon.'
      when 'sv06.5-071' then 'A dreamy night sky illustration.'
      when 'hgss2-5' then 'A Ghost type that comes out at night.'
      when 'swsh3.5-38' then 'Darkness type, dusk-coloured art.'
      else 'Silver light over night water.' end);
    if pos = 0 then update public.binders set cover_card_id = r.id where id = moon; end if;
    pos := pos + 1;
  end loop;

  pos := 0;
  for r in select c.id, c.tcgdex_id from public.cards c
           where c.user_id = uid and c.set_id = 'sv03.5' order by c.number loop
    insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
    values (uid, j151, r.id, pos, 'Part of the original 151.');
    if pos = 0 then update public.binders set cover_card_id = r.id where id = j151; end if;
    pos := pos + 1;
  end loop;

  pos := 0;
  for r in select c.id, c.tcgdex_id from public.cards c
           where c.user_id = uid and c.tcgdex_id in ('swsh7-74','sv03.5-151','swsh7-175','swsh7-167','swsh7-212','swsh12-138') loop
    insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
    values (uid, fav, r.id, pos, 'An illustration worth a page of its own.');
    if pos = 0 then update public.binders set cover_card_id = r.id where id = fav; end if;
    pos := pos + 1;
  end loop;

  insert into public.memories (user_id, title, note, happened_on, place, with_whom, card_tcgdex_id, is_private) values
    (uid, 'League night trade', 'Traded my Pikachu Celebrations card for the Umbreon VMAX alt art. Best trade of the year.', current_date - 40, 'League night', 'Mina', 'swsh7-215', true),
    (uid, 'First convention find', 'Found the Lugia V alt art at my first card show. The card that anchors my collection.', current_date - 400, 'Card convention', null, 'swsh12-186', false),
    (uid, 'Started the 151 binder', 'Opened a 151 booster box with friends and decided to finish the set.', current_date - 300, 'Home', 'Friends', 'sv03.5-151', false),
    (uid, 'A gift from a friend', 'Mina gave me Sylveon V for my birthday.', current_date - 200, null, 'Mina', 'swsh7-74', true),
    (uid, 'Childhood pack opening', 'Where it all started.', make_date(2010, 6, 1), 'Home', 'My brother', 'hgss2-5', true);

  insert into public.wishlist (user_id, tcgdex_id, name, image_url, note) values
    (uid, 'swsh8-270', 'Espeon VMAX', 'https://assets.tcgdex.net/en/swsh/swsh8/270/high.webp', 'Completes the Eeveelution alt arts.'),
    (uid, 'swsh7-95', 'Umbreon VMAX', 'https://assets.tcgdex.net/en/swsh/swsh7/95/high.webp', 'The regular art, to sit beside the alt art.')
  on conflict do nothing;

  insert into public.posts (user_id, kind, caption, media_url, body, made_with_mori, is_public, created_at) values
    (uid, 'post', 'Moonlit pages.', '/demo/cover-moonmoments.jpg', '{}', false, true, now() - interval '2 days'),
    (uid, 'post', 'The league night trade.', 'https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp', '{}', false, true, now() - interval '5 days'),
    (uid, 'post', 'Starting the 151 binder.', 'https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp', '{}', false, true, now() - interval '9 days'),
    (uid, 'post', 'Night gallery.', '/demo/cover-nightgallery.jpg', '{}', false, true, now() - interval '12 days'),
    (uid, 'post', 'Pastel page flip.', 'https://assets.tcgdex.net/en/swsh/swsh7/74/high.webp', '{}', false, true, now() - interval '15 days'),
    (uid, 'post', 'Soft palettes for the pastel pages.', '/demo/cover-softstudio.jpg', '{}', false, true, now() - interval '20 days'),
    (uid, 'video', 'The trade at league night', null,
      '{"style":"Celestial","frames":[{"image":"https://assets.tcgdex.net/en/swsh/swsh7/215/high.webp","text":"League night"},{"image":"/demo/cover-moonlight.jpg","text":"One trade"},{"image":"https://assets.tcgdex.net/en/sv/sv08.5/161/high.webp","text":"A moonlit binder"}]}',
      true, true, now() - interval '3 days'),
    (uid, 'video', 'Moon Moments, page by page.', null,
      '{"style":"Dreamy","frames":[{"image":"/demo/cover-celestial.jpg","text":"Moon Moments"},{"image":"https://assets.tcgdex.net/en/swsh/swsh12.5/062/high.webp","text":"Lunatone"},{"image":"https://assets.tcgdex.net/en/swsh/swsh6/64/high.webp","text":"Cresselia"}]}',
      true, true, now() - interval '8 days');

  insert into public.check_ins (user_id, day)
  select uid, current_date where not exists (select 1 from public.check_ins where user_id = uid and day = current_date);

  if p_profile then
    update public.profiles set
      display_name = 'Wing Wu',
      username = coalesce(username, 'wingcollects'),
      bio = 'Cards, memories and moonlit finds.',
      location = 'Melbourne',
      collecting_since = 2023,
      avatar_url = coalesce(avatar_url, '/demo/av1.png'),
      mori_outfit = 'starlight_cape'
    where id = uid;
  end if;
  update public.profiles set settings = settings || jsonb_build_object('demo_loaded', now()) where id = uid;

  return jsonb_build_object('cards', n_cards, 'binders', 3, 'memories', 5, 'posts', 8);
end $$;
revoke all on function public.load_demo_collection(boolean) from public, anon;
grant execute on function public.load_demo_collection(boolean) to authenticated;

-- Give the demo binders already loaded their artwork covers.
update public.binders set cover_image = case name
    when 'Moonlight Pokémon' then '/demo/cover-moonlight.jpg'
    when '151 Journey' then '/demo/cover-151j.jpg'
    when 'Favourite artworks' then '/demo/cover-fav.jpg' end
  where cover_image is null and name in ('Moonlight Pokémon', '151 Journey', 'Favourite artworks');

commit;
