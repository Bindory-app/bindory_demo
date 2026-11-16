-- Bindory demo: five fictional demo collectors for Search, collector profiles and following.
-- Run once in the Supabase SQL Editor after 003_binder_covers.sql.
-- They are sample accounts: no password, an unreachable .invalid email, and settings.showcase = true.
-- To remove them later: delete from auth.users where id::text like '0a000000-0000-4000-8000-%';

begin;

-- ===== Sample accounts (profiles are created by the existing signup trigger) =====
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mina@demo-collectors.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Mina Park"}', now() - interval '30 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'leo-base1@demo-collectors.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Leo Hart"}', now() - interval '60 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'jess-draws@demo-collectors.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Jess Okafor"}', now() - interval '90 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'riley-lugia@demo-collectors.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Riley Chen"}', now() - interval '120 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'arlo-collects@demo-collectors.invalid', '', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Arlo Weiss"}', now() - interval '150 days', now(), '', '', '', '')
on conflict (id) do nothing;

update public.profiles set display_name = 'Mina Park', username = 'minacollects', bio = 'Moonlit binders and the trades behind them.', location = 'Seoul', collecting_since = 2019, avatar_url = '/demo/av1.png', is_public = true, settings = settings || '{"showcase": true}' where id = '0a000000-0000-4000-8000-000000000001';
update public.profiles set display_name = 'Leo Hart', username = 'leo.base1', bio = 'Base Set kid. Still finishing the binder I started in 1999.', location = 'Toronto', collecting_since = 1999, avatar_url = '/demo/av2.png', is_public = true, settings = settings || '{"showcase": true}' where id = '0a000000-0000-4000-8000-000000000002';
update public.profiles set display_name = 'Jess Okafor', username = 'jess.draws', bio = 'Soft palettes, illustration rares and pastel pages.', location = 'London', collecting_since = 2021, avatar_url = '/demo/av3.png', is_public = true, settings = settings || '{"showcase": true}' where id = '0a000000-0000-4000-8000-000000000003';
update public.profiles set display_name = 'Riley Chen', username = 'riley.lugia', bio = 'Night skies and every Lugia I can find.', location = 'Austin', collecting_since = 2016, avatar_url = '/demo/av4.png', is_public = true, settings = settings || '{"showcase": true}' where id = '0a000000-0000-4000-8000-000000000004';
update public.profiles set display_name = 'Arlo Weiss', username = 'arlo.collects', bio = 'Collecting by artist, one illustrator at a time.', location = 'Berlin', collecting_since = 2020, avatar_url = '/demo/av5.png', is_public = true, settings = settings || '{"showcase": true}' where id = '0a000000-0000-4000-8000-000000000005';

-- ===== Their cards, binders and posts =====
insert into public.cards (user_id, tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url) values
    ('0a000000-0000-4000-8000-000000000001', 'swsh7-214', 'Umbreon VMAX', 'Evolving Skies', 'swsh7', '214', 'AKIRA EGAWA', 'Secret Rare', 2021, 'https://assets.tcgdex.net/en/swsh/swsh7/214/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'sv08.5-060', 'Umbreon ex', 'Prismatic Evolutions', 'sv08.5', '060', 'takuyoa', 'Double rare', 2025, 'https://assets.tcgdex.net/en/sv/sv08.5/060/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'swsh6-64', 'Cresselia', 'Chilling Reign', 'swsh6', '64', 'Tika Matsuno', 'Holo Rare', 2021, 'https://assets.tcgdex.net/en/swsh/swsh6/64/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'swsh10.5-034', 'Lunatone', 'Pokémon GO', 'swsh10.5', '034', 'miki kudo', 'Uncommon', 2022, 'https://assets.tcgdex.net/en/swsh/swsh10.5/034/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'swsh8-271', 'Gengar VMAX', 'Fusion Strike', 'swsh8', '271', 'sowsow', 'Secret Rare', 2021, 'https://assets.tcgdex.net/en/swsh/swsh8/271/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'swsh7-75', 'Sylveon VMAX', 'Evolving Skies', 'swsh7', '75', 'Ryota Murayama', 'Holo Rare VMAX', 2021, 'https://assets.tcgdex.net/en/swsh/swsh7/75/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'swsh7-184', 'Sylveon V', 'Evolving Skies', 'swsh7', '184', 'Yuu Nishida', 'Ultra Rare', 2021, 'https://assets.tcgdex.net/en/swsh/swsh7/184/high.webp'),
    ('0a000000-0000-4000-8000-000000000001', 'A1a-032', 'Mew ex', 'Mythical Island', 'A1a', '032', 'PLANETA CG Works', 'Four Diamond', 2024, 'https://assets.tcgdex.net/en/tcgp/A1a/032/high.webp');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000001', 'Moon Moments', 'Night skies, Darkness types and one very lucky trade.', true, '/demo/cover-moonmoments.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000001', nb.id, c.id, array_position(array['swsh7-214','sv08.5-060','swsh6-64','swsh10.5-034','swsh8-271'], c.tcgdex_id) - 1, 'Night sky art that belongs together.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000001' and c.tcgdex_id in ('swsh7-214','sv08.5-060','swsh6-64','swsh10.5-034','swsh8-271');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000001', 'Pink Pokémon', 'Every shade of pink I could find.', true, '/demo/cover-pinkpoke.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000001', nb.id, c.id, array_position(array['swsh7-75','swsh7-184','A1a-032'], c.tcgdex_id) - 1, 'Pink, soft and impossible to skip.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000001' and c.tcgdex_id in ('swsh7-75','swsh7-184','A1a-032');
insert into public.posts (user_id, kind, caption, media_url, is_public, created_at) values
  ('0a000000-0000-4000-8000-000000000001', 'post', 'Moon Moments, page one.', '/demo/cover-moonmoments.jpg', true, now() - interval '1 days'),
  ('0a000000-0000-4000-8000-000000000001', 'post', 'New pull for Moon Moments.', 'https://assets.tcgdex.net/en/swsh/swsh7/214/high.webp', true, now() - interval '5 days'),
  ('0a000000-0000-4000-8000-000000000001', 'post', 'Pink Pokémon.', '/demo/cover-pinkpoke.jpg', true, now() - interval '10 days');
insert into public.cards (user_id, tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url) values
    ('0a000000-0000-4000-8000-000000000002', 'base1-4', 'Charizard', 'Base Set', 'base1', '4', 'Mitsuhiro Arita', 'Rare', 1999, 'https://assets.tcgdex.net/en/base/base1/4/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'base1-2', 'Blastoise', 'Base Set', 'base1', '2', 'Ken Sugimori', 'Rare', 1999, 'https://assets.tcgdex.net/en/base/base1/2/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'base1-15', 'Venusaur', 'Base Set', 'base1', '15', 'Mitsuhiro Arita', 'Rare', 1999, 'https://assets.tcgdex.net/en/base/base1/15/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'neo1-9', 'Lugia', 'Neo Genesis', 'neo1', '9', 'Hironobu Yoshida', 'Rare', 2000, 'https://assets.tcgdex.net/en/neo/neo1/9/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'base5-4', 'Dark Charizard', 'Team Rocket', 'base5', '4', 'Ken Sugimori', 'Rare', 2000, 'https://assets.tcgdex.net/en/base/base5/4/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'base5-5', 'Dark Dragonite', 'Team Rocket', 'base5', '5', 'Mitsuhiro Arita', 'Rare', 2000, 'https://assets.tcgdex.net/en/base/base5/5/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'base5-7', 'Dark Golbat', 'Team Rocket', 'base5', '7', 'Mitsuhiro Arita', 'Rare', 2000, 'https://assets.tcgdex.net/en/base/base5/7/high.webp'),
    ('0a000000-0000-4000-8000-000000000002', 'base5-11', 'Dark Magneton', 'Team Rocket', 'base5', '11', 'Miki Tanaka', 'Rare', 2000, 'https://assets.tcgdex.net/en/base/base5/11/high.webp');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000002', 'Retro Archive', 'The cards that started it all.', true, '/demo/cover-retro.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000002', nb.id, c.id, array_position(array['base1-4','base1-2','base1-15','neo1-9'], c.tcgdex_id) - 1, 'A first-generation classic.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000002' and c.tcgdex_id in ('base1-4','base1-2','base1-15','neo1-9');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000002', 'Team Rocket archive', 'Dark Pokémon from the Team Rocket set.', true, '/demo/cover-rocket.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000002', nb.id, c.id, array_position(array['base5-4','base5-5','base5-7','base5-11'], c.tcgdex_id) - 1, 'From the Team Rocket set.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000002' and c.tcgdex_id in ('base5-4','base5-5','base5-7','base5-11');
insert into public.posts (user_id, kind, caption, media_url, is_public, created_at) values
  ('0a000000-0000-4000-8000-000000000002', 'post', 'Retro Archive, page one.', '/demo/cover-retro.jpg', true, now() - interval '2 days'),
  ('0a000000-0000-4000-8000-000000000002', 'post', 'New pull for Retro Archive.', 'https://assets.tcgdex.net/en/base/base1/4/high.webp', true, now() - interval '6 days'),
  ('0a000000-0000-4000-8000-000000000002', 'post', 'Team Rocket archive.', '/demo/cover-rocket.jpg', true, now() - interval '11 days');
insert into public.cards (user_id, tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url) values
    ('0a000000-0000-4000-8000-000000000003', 'sv03.5-025', 'Pikachu', '151', 'sv03.5', '025', 'Naoyo Kimura', 'Common', 2023, 'https://assets.tcgdex.net/en/sv/sv03.5/025/high.webp'),
    ('0a000000-0000-4000-8000-000000000003', 'swsh12.5-160', 'Pikachu', 'Crown Zenith', 'swsh12.5', '160', 'You Iribi', 'Secret Rare', 2023, 'https://assets.tcgdex.net/en/swsh/swsh12.5/160/high.webp'),
    ('0a000000-0000-4000-8000-000000000003', 'neo3-9', 'Jumpluff', 'Neo Revelation', 'neo3', '9', 'Kagemaru Himeno', 'Rare', 2001, 'https://assets.tcgdex.net/en/neo/neo3/9/high.webp'),
    ('0a000000-0000-4000-8000-000000000003', 'swsh7-8', 'Leafeon VMAX', 'Evolving Skies', 'swsh7', '8', 'PLANETA Tsuji', 'Holo Rare VMAX', 2021, 'https://assets.tcgdex.net/en/swsh/swsh7/8/high.webp'),
    ('0a000000-0000-4000-8000-000000000003', 'neo2-15', 'Ursaring', 'Neo Discovery', 'neo2', '15', 'Naoyo Kimura', 'Rare', 2001, 'https://assets.tcgdex.net/en/neo/neo2/15/high.webp'),
    ('0a000000-0000-4000-8000-000000000003', 'sv06.5-030', 'Absol', 'Shrouded Fable', 'sv06.5', '030', 'rika', 'Common', 2024, 'https://assets.tcgdex.net/en/sv/sv06.5/030/high.webp');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000003', 'Soft Studio', 'Pastel artwork, page by page.', true, '/demo/cover-softstudio.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000003', nb.id, c.id, array_position(array['sv03.5-025','swsh12.5-160','neo3-9','swsh7-8'], c.tcgdex_id) - 1, 'Soft colours that sit well together.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000003' and c.tcgdex_id in ('sv03.5-025','swsh12.5-160','neo3-9','swsh7-8');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000003', 'Sketches', 'Illustrations with a hand-drawn feel.', true, '/demo/cover-sketches.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000003', nb.id, c.id, array_position(array['neo2-15','sv06.5-030','swsh12.5-160'], c.tcgdex_id) - 1, 'Looks like it came from a sketchbook.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000003' and c.tcgdex_id in ('neo2-15','sv06.5-030','swsh12.5-160');
insert into public.posts (user_id, kind, caption, media_url, is_public, created_at) values
  ('0a000000-0000-4000-8000-000000000003', 'post', 'Soft Studio, page one.', '/demo/cover-softstudio.jpg', true, now() - interval '3 days'),
  ('0a000000-0000-4000-8000-000000000003', 'post', 'New pull for Soft Studio.', 'https://assets.tcgdex.net/en/sv/sv03.5/025/high.webp', true, now() - interval '7 days'),
  ('0a000000-0000-4000-8000-000000000003', 'post', 'Sketches.', '/demo/cover-sketches.jpg', true, now() - interval '12 days');
insert into public.cards (user_id, tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url) values
    ('0a000000-0000-4000-8000-000000000004', 'swsh12-139', 'Lugia VSTAR', 'Silver Tempest', 'swsh12', '139', 'PLANETA Mochizuki', 'Holo Rare VSTAR', 2022, 'https://assets.tcgdex.net/en/swsh/swsh12/139/high.webp'),
    ('0a000000-0000-4000-8000-000000000004', 'swsh12-185', 'Lugia V', 'Silver Tempest', 'swsh12', '185', '5ban Graphics', 'Ultra Rare', 2022, 'https://assets.tcgdex.net/en/swsh/swsh12/185/high.webp'),
    ('0a000000-0000-4000-8000-000000000004', 'swsh12-211', 'Lugia VSTAR', 'Silver Tempest', 'swsh12', '211', 'PLANETA Mochizuki', 'Secret Rare', 2022, 'https://assets.tcgdex.net/en/swsh/swsh12/211/high.webp'),
    ('0a000000-0000-4000-8000-000000000004', 'neo1-9', 'Lugia', 'Neo Genesis', 'neo1', '9', 'Hironobu Yoshida', 'Rare', 2000, 'https://assets.tcgdex.net/en/neo/neo1/9/high.webp'),
    ('0a000000-0000-4000-8000-000000000004', 'swsh7-30', 'Vaporeon VMAX', 'Evolving Skies', 'swsh7', '30', '5ban Graphics', 'Holo Rare VMAX', 2021, 'https://assets.tcgdex.net/en/swsh/swsh7/30/high.webp'),
    ('0a000000-0000-4000-8000-000000000004', 'swsh7-41', 'Glaceon VMAX', 'Evolving Skies', 'swsh7', '41', 'PLANETA Tsuji', 'Holo Rare VMAX', 2021, 'https://assets.tcgdex.net/en/swsh/swsh7/41/high.webp'),
    ('0a000000-0000-4000-8000-000000000004', 'base1-2', 'Blastoise', 'Base Set', 'base1', '2', 'Ken Sugimori', 'Rare', 1999, 'https://assets.tcgdex.net/en/base/base1/2/high.webp');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000004', 'Night Gallery', 'Lugia through the years.', true, '/demo/cover-nightgallery.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000004', nb.id, c.id, array_position(array['swsh12-139','swsh12-185','swsh12-211','neo1-9'], c.tcgdex_id) - 1, 'Another Lugia for the gallery.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000004' and c.tcgdex_id in ('swsh12-139','swsh12-185','swsh12-211','neo1-9');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000004', 'Classic Blue', 'Water and ice, cool blues only.', true, '/demo/cover-classicblue.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000004', nb.id, c.id, array_position(array['swsh7-30','swsh7-41','base1-2'], c.tcgdex_id) - 1, 'Cool blues for this page.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000004' and c.tcgdex_id in ('swsh7-30','swsh7-41','base1-2');
insert into public.posts (user_id, kind, caption, media_url, is_public, created_at) values
  ('0a000000-0000-4000-8000-000000000004', 'post', 'Night Gallery, page one.', '/demo/cover-nightgallery.jpg', true, now() - interval '4 days'),
  ('0a000000-0000-4000-8000-000000000004', 'post', 'New pull for Night Gallery.', 'https://assets.tcgdex.net/en/swsh/swsh12/139/high.webp', true, now() - interval '8 days'),
  ('0a000000-0000-4000-8000-000000000004', 'post', 'Classic Blue.', '/demo/cover-classicblue.jpg', true, now() - interval '13 days');
insert into public.cards (user_id, tcgdex_id, name, set_name, set_id, number, illustrator, rarity, year, image_url) values
    ('0a000000-0000-4000-8000-000000000005', 'neo1-9', 'Lugia', 'Neo Genesis', 'neo1', '9', 'Hironobu Yoshida', 'Rare', 2000, 'https://assets.tcgdex.net/en/neo/neo1/9/high.webp'),
    ('0a000000-0000-4000-8000-000000000005', 'neo2-15', 'Ursaring', 'Neo Discovery', 'neo2', '15', 'Naoyo Kimura', 'Rare', 2001, 'https://assets.tcgdex.net/en/neo/neo2/15/high.webp'),
    ('0a000000-0000-4000-8000-000000000005', 'neo3-9', 'Jumpluff', 'Neo Revelation', 'neo3', '9', 'Kagemaru Himeno', 'Rare', 2001, 'https://assets.tcgdex.net/en/neo/neo3/9/high.webp'),
    ('0a000000-0000-4000-8000-000000000005', 'base1-4', 'Charizard', 'Base Set', 'base1', '4', 'Mitsuhiro Arita', 'Rare', 1999, 'https://assets.tcgdex.net/en/base/base1/4/high.webp'),
    ('0a000000-0000-4000-8000-000000000005', 'base5-5', 'Dark Dragonite', 'Team Rocket', 'base5', '5', 'Mitsuhiro Arita', 'Rare', 2000, 'https://assets.tcgdex.net/en/base/base5/5/high.webp'),
    ('0a000000-0000-4000-8000-000000000005', 'base5-7', 'Dark Golbat', 'Team Rocket', 'base5', '7', 'Mitsuhiro Arita', 'Rare', 2000, 'https://assets.tcgdex.net/en/base/base5/7/high.webp'),
    ('0a000000-0000-4000-8000-000000000005', 'swsh9-174', 'Charizard VSTAR', 'Brilliant Stars', 'swsh9', '174', '5ban Graphics', 'Secret Rare', 2022, 'https://assets.tcgdex.net/en/swsh/swsh9/174/high.webp');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000005', 'Neo Dreams', 'The Neo era, end to end.', true, '/demo/cover-neodreams.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000005', nb.id, c.id, array_position(array['neo1-9','neo2-15','neo3-9'], c.tcgdex_id) - 1, 'A Neo-era favourite.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000005' and c.tcgdex_id in ('neo1-9','neo2-15','neo3-9');
with nb as (
  insert into public.binders (user_id, name, description, is_public, cover_image)
  values ('0a000000-0000-4000-8000-000000000005', 'Artist Archive', 'Cards grouped by the people who drew them.', true, '/demo/cover-artistarchive.jpg') returning id
)
insert into public.binder_cards (user_id, binder_id, card_id, position, reason)
select '0a000000-0000-4000-8000-000000000005', nb.id, c.id, array_position(array['base1-4','base5-5','base5-7','swsh9-174'], c.tcgdex_id) - 1, 'Filed under its illustrator.'
from nb join public.cards c on c.user_id = '0a000000-0000-4000-8000-000000000005' and c.tcgdex_id in ('base1-4','base5-5','base5-7','swsh9-174');
insert into public.posts (user_id, kind, caption, media_url, is_public, created_at) values
  ('0a000000-0000-4000-8000-000000000005', 'post', 'Neo Dreams, page one.', '/demo/cover-neodreams.jpg', true, now() - interval '5 days'),
  ('0a000000-0000-4000-8000-000000000005', 'post', 'New pull for Neo Dreams.', 'https://assets.tcgdex.net/en/neo/neo1/9/high.webp', true, now() - interval '9 days'),
  ('0a000000-0000-4000-8000-000000000005', 'post', 'Artist Archive.', '/demo/cover-artistarchive.jpg', true, now() - interval '14 days');
-- Point each binder's cover card at its first card (used where artwork isn't shown).
update public.binders b set cover_card_id = (select bc.card_id from public.binder_cards bc where bc.binder_id = b.id order by bc.position limit 1)
where b.user_id::text like '0a000000-0000-4000-8000-%' and b.cover_card_id is null;

-- The demo collectors follow each other.
insert into public.follows (follower_id, followee_id)
select a.id, b.id from auth.users a, auth.users b
where a.id::text like '0a000000-0000-4000-8000-%' and b.id::text like '0a000000-0000-4000-8000-%' and a.id <> b.id
on conflict do nothing;

-- ===== Public collector reads (public profiles only; never private memories or private binders) =====

-- Search: collectors to explore. Excludes the person searching.
create or replace function public.list_public_collectors(p_query text default '') returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by (x->>'showcase')::boolean desc, x->>'display_name'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'bio', p.bio,
      'showcase', coalesce((p.settings->>'showcase')::boolean, false),
      'binders', (select count(*) from public.binders b where b.user_id = p.id and b.is_public)) x
    from public.profiles p
    where p.is_public and p.username is not null and p.id is distinct from auth.uid()
      and (coalesce(p_query, '') = '' or p.display_name ilike '%' || p_query || '%'
           or p.username ilike '%' || p_query || '%' or p.bio ilike '%' || p_query || '%')
    limit 20) s;
$$;
revoke all on function public.list_public_collectors(text) from public;
grant execute on function public.list_public_collectors(text) to anon, authenticated;

-- A collector's public profile: details, counts, public binders and public posts.
create or replace function public.read_public_profile(p_username text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'bio', p.bio, 'location', p.location, 'collecting_since', p.collecting_since,
    'is_me', p.id = auth.uid(),
    'followers', (select count(*) from public.follows f where f.followee_id = p.id),
    'following', (select count(*) from public.follows f where f.follower_id = p.id),
    'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    'binders', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'cover_image', b.cover_image,
        'cover', (select c.image_url from public.cards c where c.id = b.cover_card_id and c.user_id = b.user_id),
        'count', (select count(*) from public.binder_cards bc where bc.binder_id = b.id and bc.user_id = b.user_id))
        order by b.created_at)
      from public.binders b where b.user_id = p.id and b.is_public), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object(
        'id', po.id, 'kind', po.kind, 'caption', po.caption, 'media_url', po.media_url, 'body', po.body,
        'made_with_mori', po.made_with_mori, 'is_public', true, 'created_at', po.created_at)
        order by po.created_at desc)
      from public.posts po where po.user_id = p.id and po.is_public), '[]'::jsonb))
  from public.profiles p
  where p.username = lower(p_username) and p.is_public;
$$;
revoke all on function public.read_public_profile(text) from public;
grant execute on function public.read_public_profile(text) to anon, authenticated;

-- Public binder page: also return the owner's username so it can link to their profile.
create or replace function public.read_public_binder(p_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('id',b.id,'name',b.name,'description',b.description,'is_public',b.is_public,'cover_card_id',b.cover_card_id,'cover_image',b.cover_image,
  'owner',(select coalesce(p.display_name,'A collector') from public.profiles p where p.id=b.user_id and p.is_public),
  'owner_username',(select p.username from public.profiles p where p.id=b.user_id and p.is_public),
  'owner_avatar',(select p.avatar_url from public.profiles p where p.id=b.user_id and p.is_public),
  'owner_bio',(select p.bio from public.profiles p where p.id=b.user_id and p.is_public),
  'is_mine', b.user_id = auth.uid(),
  'cards',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'image_url',c.image_url,'reason',bc.reason,'position',bc.position) order by bc.position,bc.id) from public.binder_cards bc join public.cards c on c.id=bc.card_id and c.user_id=b.user_id where bc.binder_id=b.id and bc.user_id=b.user_id),'[]'::jsonb))
 from public.binders b where b.id=p_id and b.is_public=true;
$$;
revoke all on function public.read_public_binder(uuid) from public;
grant execute on function public.read_public_binder(uuid) to anon, authenticated;

commit;
