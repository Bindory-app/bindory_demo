-- Bindory demo: record who entered the demo through the password gate.
-- Plain ASCII. Run once in the Supabase SQL Editor.
-- The gate can only add rows; nobody can read them through the API. View them in the
-- Supabase dashboard: Table Editor > demo_testers.

begin;

create table public.demo_testers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  user_agent text check (user_agent is null or length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create index demo_testers_created on public.demo_testers (created_at desc);

alter table public.demo_testers enable row level security;
revoke all on public.demo_testers from anon, authenticated;
grant insert (email, user_agent) on public.demo_testers to anon, authenticated;
create policy "gate can record testers" on public.demo_testers for insert to anon, authenticated with check (true);
grant all on public.demo_testers to service_role;

commit;
