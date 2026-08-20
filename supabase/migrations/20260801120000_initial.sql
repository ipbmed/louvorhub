-- LouvorHub initial schema (multi-tenant)

create extension if not exists "pgcrypto" with schema extensions;

-- Roles
create type public.member_role as enum ('owner', 'admin', 'leader', 'member');
create type public.song_kind as enum ('hino', 'cantico');
create type public.playlist_visibility as enum ('public_link', 'org', 'group');
create type public.liturgy_item_type as enum (
  'song', 'playlist', 'reading', 'prayer', 'announcement', 'other'
);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  is_global boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_org_id_idx on public.memberships (org_id);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  slug text not null,
  title text not null,
  kind public.song_kind not null,
  number int check (number is null or (number >= 1 and number <= 999)),
  artist text,
  tags text[] not null default '{}',
  lyrics_md text not null default '',
  is_public boolean not null default true,
  source_song_id uuid references public.songs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_hino_number check (
    (kind = 'hino' and number is not null) or (kind = 'cantico' and number is null)
  ),
  unique (org_id, slug)
);

create index songs_org_id_idx on public.songs (org_id);
create index songs_kind_idx on public.songs (kind);
create index songs_title_idx on public.songs using gin (to_tsvector('portuguese', title));

create table public.song_links (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0
);

create table public.song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  version_key text not null,
  label text not null,
  musical_key text,
  bpm int check (bpm is null or (bpm >= 30 and bpm <= 300)),
  instructions text[] not null default '{}',
  lyrics_chords text not null default '',
  sort_order int not null default 0,
  unique (song_id, version_key)
);

create table public.song_version_links (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.song_versions (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null,
  purpose text,
  visibility public.playlist_visibility not null default 'public_link',
  share_code text not null unique default encode(extensions.gen_random_bytes(8), 'hex'),
  is_permanent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index playlists_share_code_idx on public.playlists (share_code);
create index playlists_org_id_idx on public.playlists (org_id);

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  sort_order int not null default 0,
  override_key text,
  override_bpm int,
  notes text
);

create table public.playlist_editions (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  title text not null,
  event_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.playlist_edition_items (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.playlist_editions (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  sort_order int not null default 0,
  override_key text,
  override_bpm int,
  notes text
);

create table public.playlist_comments (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  edition_id uuid references public.playlist_editions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.liturgies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  service_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.liturgy_items (
  id uuid primary key default gen_random_uuid(),
  liturgy_id uuid not null references public.liturgies (id) on delete cascade,
  item_type public.liturgy_item_type not null default 'other',
  title text not null,
  body text,
  song_id uuid references public.songs (id) on delete set null,
  playlist_id uuid references public.playlists (id) on delete set null,
  sort_order int not null default 0
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null default 'Culto',
  service_date date not null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  role_label text not null,
  user_id uuid references public.profiles (id) on delete set null,
  person_name text,
  sort_order int not null default 0,
  constraint schedule_assignments_person check (user_id is not null or person_name is not null)
);

-- Helpers
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(p_org_id uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger songs_updated_at before update on public.songs
  for each row execute function public.set_updated_at();
create trigger playlists_updated_at before update on public.playlists
  for each row execute function public.set_updated_at();
create trigger playlist_editions_updated_at before update on public.playlist_editions
  for each row execute function public.set_updated_at();
create trigger liturgies_updated_at before update on public.liturgies
  for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_links enable row level security;
alter table public.song_versions enable row level security;
alter table public.song_version_links enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.playlist_editions enable row level security;
alter table public.playlist_edition_items enable row level security;
alter table public.playlist_comments enable row level security;
alter table public.liturgies enable row level security;
alter table public.liturgy_items enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_assignments enable row level security;

-- Profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Organizations
create policy "orgs_select" on public.organizations for select using (
  is_global or true
);
create policy "orgs_insert" on public.organizations for insert to authenticated
  with check (true);
create policy "orgs_update" on public.organizations for update using (
  public.has_org_role(id, array['owner', 'admin']::public.member_role[])
);

-- Memberships
create policy "memberships_select" on public.memberships for select using (
  user_id = auth.uid() or public.is_org_member(org_id)
);
create policy "memberships_insert_self" on public.memberships for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.has_org_role(org_id, array['owner', 'admin']::public.member_role[])
  );
create policy "memberships_update" on public.memberships for update using (
  public.has_org_role(org_id, array['owner', 'admin']::public.member_role[])
);
create policy "memberships_delete" on public.memberships for delete using (
  user_id = auth.uid()
  or public.has_org_role(org_id, array['owner', 'admin']::public.member_role[])
);

-- Groups
create policy "groups_select" on public.groups for select using (public.is_org_member(org_id));
create policy "groups_write" on public.groups for all using (
  public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);

create policy "group_members_select" on public.group_members for select using (
  exists (
    select 1 from public.groups g
    where g.id = group_id and public.is_org_member(g.org_id)
  )
);
create policy "group_members_write" on public.group_members for all using (
  exists (
    select 1 from public.groups g
    where g.id = group_id
      and public.has_org_role(g.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

-- Songs: public read when is_public or global; members always; write for admin/leader
create policy "songs_select" on public.songs for select using (
  is_public
  or org_id is null
  or exists (select 1 from public.organizations o where o.id = org_id and o.is_global)
  or public.is_org_member(org_id)
);
create policy "songs_insert" on public.songs for insert to authenticated
  with check (
    public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
  );
create policy "songs_update" on public.songs for update using (
  public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);
create policy "songs_delete" on public.songs for delete using (
  public.has_org_role(org_id, array['owner', 'admin']::public.member_role[])
);

create policy "song_links_select" on public.song_links for select using (
  exists (select 1 from public.songs s where s.id = song_id)
);
create policy "song_links_write" on public.song_links for all using (
  exists (
    select 1 from public.songs s
    where s.id = song_id
      and public.has_org_role(s.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

create policy "song_versions_select" on public.song_versions for select using (
  exists (select 1 from public.songs s where s.id = song_id)
);
create policy "song_versions_write" on public.song_versions for all using (
  exists (
    select 1 from public.songs s
    where s.id = song_id
      and public.has_org_role(s.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

create policy "song_version_links_select" on public.song_version_links for select using (
  exists (
    select 1 from public.song_versions v
    join public.songs s on s.id = v.song_id
    where v.id = version_id
  )
);
create policy "song_version_links_write" on public.song_version_links for all using (
  exists (
    select 1 from public.song_versions v
    join public.songs s on s.id = v.song_id
    where v.id = version_id
      and public.has_org_role(s.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

-- Playlists
create policy "playlists_select" on public.playlists for select using (
  visibility = 'public_link'
  or (org_id is not null and public.is_org_member(org_id))
  or created_by = auth.uid()
);
create policy "playlists_insert" on public.playlists for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      visibility = 'public_link'
      or public.is_org_member(org_id)
    )
  );
create policy "playlists_insert_anon" on public.playlists for insert to anon
  with check (visibility = 'public_link' and is_permanent = false);
create policy "playlists_update" on public.playlists for update using (
  created_by = auth.uid()
  or public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);
create policy "playlists_delete" on public.playlists for delete using (
  created_by = auth.uid()
  or public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);

create policy "playlist_items_select" on public.playlist_items for select using (
  exists (select 1 from public.playlists p where p.id = playlist_id)
);
create policy "playlist_items_write" on public.playlist_items for all using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id
      and (
        p.created_by = auth.uid()
        or public.has_org_role(p.org_id, array['owner', 'admin', 'leader']::public.member_role[])
        or (p.visibility = 'public_link' and not p.is_permanent)
      )
  )
);
create policy "playlist_items_insert_anon" on public.playlist_items for insert to anon
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and p.visibility = 'public_link'
        and not p.is_permanent
    )
  );

create policy "playlist_editions_select" on public.playlist_editions for select using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id
      and (p.visibility = 'public_link' or public.is_org_member(p.org_id) or p.created_by = auth.uid())
  )
);
create policy "playlist_editions_write" on public.playlist_editions for all using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id
      and (
        p.created_by = auth.uid()
        or public.has_org_role(p.org_id, array['owner', 'admin', 'leader', 'member']::public.member_role[])
      )
  )
);

create policy "playlist_edition_items_select" on public.playlist_edition_items for select using (
  exists (
    select 1 from public.playlist_editions e
    join public.playlists p on p.id = e.playlist_id
    where e.id = edition_id
  )
);
create policy "playlist_edition_items_write" on public.playlist_edition_items for all using (
  exists (
    select 1 from public.playlist_editions e
    join public.playlists p on p.id = e.playlist_id
    where e.id = edition_id
      and (
        p.created_by = auth.uid()
        or public.has_org_role(p.org_id, array['owner', 'admin', 'leader', 'member']::public.member_role[])
      )
  )
);

create policy "playlist_comments_select" on public.playlist_comments for select using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (public.is_org_member(p.org_id) or p.created_by = auth.uid())
  )
);
create policy "playlist_comments_insert" on public.playlist_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.playlists p
      where p.id = playlist_id and public.is_org_member(p.org_id)
    )
  );
create policy "playlist_comments_delete" on public.playlist_comments for delete using (
  user_id = auth.uid()
);

-- Liturgies
create policy "liturgies_select" on public.liturgies for select using (public.is_org_member(org_id));
create policy "liturgies_write" on public.liturgies for all using (
  public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);

create policy "liturgy_items_select" on public.liturgy_items for select using (
  exists (select 1 from public.liturgies l where l.id = liturgy_id and public.is_org_member(l.org_id))
);
create policy "liturgy_items_write" on public.liturgy_items for all using (
  exists (
    select 1 from public.liturgies l
    where l.id = liturgy_id
      and public.has_org_role(l.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

-- Schedules
create policy "schedules_select" on public.schedules for select using (public.is_org_member(org_id));
create policy "schedules_write" on public.schedules for all using (
  public.has_org_role(org_id, array['owner', 'admin', 'leader']::public.member_role[])
);

create policy "schedule_assignments_select" on public.schedule_assignments for select using (
  exists (select 1 from public.schedules s where s.id = schedule_id and public.is_org_member(s.org_id))
);
create policy "schedule_assignments_write" on public.schedule_assignments for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and public.has_org_role(s.org_id, array['owner', 'admin', 'leader']::public.member_role[])
  )
);

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('org-logos', 'org-logos', true),
  ('song-assets', 'song-assets', false)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "org_logos_public_read" on storage.objects for select using (bucket_id = 'org-logos');
create policy "org_logos_member_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );

create policy "song_assets_member_read" on storage.objects for select using (
  bucket_id = 'song-assets'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);
create policy "song_assets_leader_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'song-assets'
    and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'leader']::public.member_role[])
  );

-- Seed global library org (content filled by migrate script)
insert into public.organizations (name, slug, is_global, invite_code)
values ('Novo Cântico (biblioteca)', 'novo-cantico', true, 'global-library')
on conflict (slug) do nothing;
