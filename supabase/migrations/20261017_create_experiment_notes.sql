-- Owner-scoped Experiment Notes for the existing Supabase project.
-- RLS is enforced by Postgres; API calls use the requester's Supabase JWT,
-- never a service-role key.

create table if not exists public.experiment_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title varchar(200) not null check (char_length(btrim(title)) between 1 and 200),
  content varchar(10000) not null check (char_length(btrim(content)) between 1 and 10000),
  dataset_name varchar(100) not null default '',
  model_name varchar(100) not null default '',
  experiment_reference varchar(100) not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiment_notes_owner_updated_idx
  on public.experiment_notes (owner_id, updated_at desc);
create index if not exists experiment_notes_owner_tags_idx
  on public.experiment_notes using gin (tags);
create index if not exists experiment_notes_owner_reference_idx
  on public.experiment_notes (owner_id, experiment_reference);

alter table public.experiment_notes enable row level security;

drop policy if exists experiment_notes_select_own on public.experiment_notes;
create policy experiment_notes_select_own
  on public.experiment_notes for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists experiment_notes_insert_own on public.experiment_notes;
create policy experiment_notes_insert_own
  on public.experiment_notes for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists experiment_notes_update_own on public.experiment_notes;
create policy experiment_notes_update_own
  on public.experiment_notes for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists experiment_notes_delete_own on public.experiment_notes;
create policy experiment_notes_delete_own
  on public.experiment_notes for delete to authenticated
  using (auth.uid() = owner_id);

-- Permit unauthenticated health probes to test relation availability. RLS
-- intentionally has no anon policy, so anonymous queries return no rows.
grant select on public.experiment_notes to anon;
grant select, insert, update, delete on public.experiment_notes to authenticated;

create or replace function public.set_experiment_notes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists experiment_notes_set_updated_at on public.experiment_notes;
create trigger experiment_notes_set_updated_at
before update on public.experiment_notes
for each row execute function public.set_experiment_notes_updated_at();
