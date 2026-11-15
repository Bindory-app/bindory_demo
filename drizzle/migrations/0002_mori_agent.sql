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