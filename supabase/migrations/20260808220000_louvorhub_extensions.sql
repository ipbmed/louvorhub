-- LouvorHub UI extensions on top of ipbsong-2 base schema

-- Profiles: directory fields for UserManager
alter table public.profiles
  add column if not exists phone text,
  add column if not exists main_role text;

-- Organizations: church contact / display fields
alter table public.organizations
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists pastor text,
  add column if not exists phone text,
  add column if not exists color text;

-- Groups (MusicGroup in app): leader label
alter table public.groups
  add column if not exists leader_name text;

-- Group members: band-member style fields
alter table public.group_members
  add column if not exists role_label text,
  add column if not exists person_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive'));

-- Allow guest-style members without a linked profile
alter table public.group_members
  alter column user_id drop not null;

alter table public.group_members
  drop constraint if exists group_members_user_id_key;

alter table public.group_members
  drop constraint if exists group_members_group_id_user_id_key;

create unique index if not exists group_members_group_user_unique
  on public.group_members (group_id, user_id)
  where user_id is not null;

alter table public.group_members
  drop constraint if exists group_members_person_check;

alter table public.group_members
  add constraint group_members_person_check
  check (user_id is not null or person_name is not null);

-- Categories (org-scoped)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  icon_name text,
  color text,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists categories_org_id_idx on public.categories (org_id);

alter table public.songs
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists hymnal text,
  add column if not exists subtitle text,
  add column if not exists composer text,
  add column if not exists time_signature text;

-- Favorites
create table if not exists public.user_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index if not exists user_favorites_song_id_idx on public.user_favorites (song_id);

-- Schedule extensions
create type public.schedule_status as enum ('pending', 'confirmed', 'completed');
create type public.availability_status as enum ('pending', 'confirmed', 'declined');

alter table public.schedules
  add column if not exists service_time text,
  add column if not exists service_type text not null default 'Culto',
  add column if not exists theme text,
  add column if not exists rehearsal_date date,
  add column if not exists rehearsal_time text,
  add column if not exists status public.schedule_status not null default 'pending',
  add column if not exists is_finalized boolean not null default false,
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by uuid references public.profiles (id) on delete set null,
  add column if not exists playlist_id uuid references public.playlists (id) on delete set null,
  add column if not exists group_id uuid references public.groups (id) on delete set null;

alter table public.schedule_assignments
  add column if not exists availability_status public.availability_status not null default 'pending',
  add column if not exists decline_reason text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.schedule_songs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  sort_order int not null default 0,
  title text,
  musical_key text,
  bpm text,
  time_signature text,
  lyrics_chords text,
  notes text,
  is_customized boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (schedule_id, song_id)
);

create index if not exists schedule_songs_schedule_id_idx on public.schedule_songs (schedule_id);

-- Liturgy extensions
alter table public.liturgies
  add column if not exists theme text,
  add column if not exists bible_verse text,
  add column if not exists preacher text,
  add column if not exists leader text;

-- Widen liturgy item types for LouvorHub UI (keep old enum values usable via text column)
alter table public.liturgy_items
  add column if not exists responsible text,
  add column if not exists duration text,
  add column if not exists item_kind text;

-- Backfill item_kind from enum
update public.liturgy_items
set item_kind = item_type::text
where item_kind is null;

alter table public.liturgy_items
  alter column item_kind set default 'custom';

alter table public.liturgy_items
  drop constraint if exists liturgy_items_item_kind_check;

alter table public.liturgy_items
  add constraint liturgy_items_item_kind_check check (
    item_kind in (
      'hymn', 'song', 'playlist', 'prayer', 'reading', 'praise', 'sermon',
      'offertory', 'supper', 'announcements', 'announcement', 'benediction',
      'other', 'custom'
    )
  );

-- Allow org owners/admins to delete churches
drop policy if exists "orgs_delete" on public.organizations;
create policy "orgs_delete" on public.organizations for delete using (
  public.has_org_role(id, array['owner', 'admin']::public.member_role[])
);

-- RLS for new tables
alter table public.categories enable row level security;
alter table public.user_favorites enable row level security;
alter table public.schedule_songs enable row level security;

create policy "categories_select" on public.categories for select using (
  public.is_org_member(org_id)
  or exists (select 1 from public.organizations o where o.id = org_id and o.is_global)
);
create policy "categories_write" on public.categories for all using (
  public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);

create policy "favorites_select_own" on public.user_favorites for select using (user_id = auth.uid());
create policy "favorites_insert_own" on public.user_favorites for insert to authenticated
  with check (user_id = auth.uid());
create policy "favorites_delete_own" on public.user_favorites for delete using (user_id = auth.uid());

create policy "schedule_songs_select" on public.schedule_songs for select using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_org_member(s.org_id)
  )
);
create policy "schedule_songs_write" on public.schedule_songs for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and public.has_org_role(s.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

-- Assignment self-update for availability
create policy "schedule_assignments_self_update" on public.schedule_assignments for update using (
  user_id = auth.uid()
  or exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and public.has_org_role(s.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

create trigger schedule_songs_updated_at before update on public.schedule_songs
  for each row execute function public.set_updated_at();

create trigger schedule_assignments_updated_at before update on public.schedule_assignments
  for each row execute function public.set_updated_at();
