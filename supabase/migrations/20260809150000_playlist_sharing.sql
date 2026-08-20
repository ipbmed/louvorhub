-- =============================================================================
-- Repertórios: kind, private visibility, playlist_shares, RLS helpers
-- =============================================================================

-- 1) Extend visibility enum with private
do $$ begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'playlist_visibility'
      and e.enumlabel = 'private'
  ) then
    alter type public.playlist_visibility add value 'private';
  end if;
end $$;

-- 2) Playlist kind
do $$ begin
  create type public.playlist_kind as enum ('individual', 'group_schedule');
exception when duplicate_object then null;
end $$;

alter table public.playlists
  add column if not exists kind public.playlist_kind not null default 'individual';

-- Legado visibility=org é tratado como privado no app (toAppVisibility).
-- Conversão em massa fica para após o commit do enum (PG < 15).

-- 3) Shares (view | edit) for individual collaborators
do $$ begin
  create type public.playlist_share_permission as enum ('view', 'edit');
exception when duplicate_object then null;
end $$;

create table if not exists public.playlist_shares (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission public.playlist_share_permission not null default 'view',
  created_at timestamptz not null default now(),
  unique (playlist_id, user_id)
);

create index if not exists playlist_shares_user_id_idx on public.playlist_shares (user_id);
create index if not exists playlist_shares_playlist_id_idx on public.playlist_shares (playlist_id);

alter table public.playlist_shares enable row level security;

-- 4) Helpers
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
  );
$$;

create or replace function public.can_view_playlist(p_playlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playlists p
    where p.id = p_playlist_id
      and (
        public.is_system_admin()
        or p.visibility = 'public_link'
        or p.created_by = auth.uid()
        or exists (
          select 1 from public.playlist_shares s
          where s.playlist_id = p.id and s.user_id = auth.uid()
        )
        or (
          p.kind = 'group_schedule'
          and p.group_id is not null
          and public.is_group_member(p.group_id)
        )
        or (
          p.visibility = 'group'
          and p.group_id is not null
          and public.is_group_member(p.group_id)
        )
      )
  );
$$;

create or replace function public.can_edit_playlist(p_playlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playlists p
    where p.id = p_playlist_id
      and (
        public.is_system_admin()
        or p.created_by = auth.uid()
        or exists (
          select 1 from public.playlist_shares s
          where s.playlist_id = p.id
            and s.user_id = auth.uid()
            and s.permission = 'edit'
        )
        or (
          p.kind = 'group_schedule'
          and p.group_id is not null
          and (
            public.has_group_editor(p.group_id)
            or public.can_manage_church_groups(p.org_id)
          )
        )
      )
  );
$$;

-- 5) RLS playlists
drop policy if exists "playlists_select" on public.playlists;
create policy "playlists_select" on public.playlists for select using (
  public.can_view_playlist(id)
  or visibility = 'public_link'
);

drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert to authenticated
  with check (
    created_by = auth.uid()
    or public.is_system_admin()
  );

drop policy if exists "playlists_update" on public.playlists;
create policy "playlists_update" on public.playlists for update using (
  public.can_edit_playlist(id)
);

drop policy if exists "playlists_delete" on public.playlists;
create policy "playlists_delete" on public.playlists for delete using (
  public.can_edit_playlist(id)
);

-- 6) playlist_items
drop policy if exists "playlist_items_select" on public.playlist_items;
create policy "playlist_items_select" on public.playlist_items for select using (
  public.can_view_playlist(playlist_id)
  or exists (
    select 1 from public.playlists p
    where p.id = playlist_id and p.visibility = 'public_link'
  )
);

drop policy if exists "playlist_items_write" on public.playlist_items;
create policy "playlist_items_write" on public.playlist_items for all using (
  public.can_edit_playlist(playlist_id)
) with check (
  public.can_edit_playlist(playlist_id)
);

-- 7) playlist_shares policies
drop policy if exists "playlist_shares_select" on public.playlist_shares;
create policy "playlist_shares_select" on public.playlist_shares for select using (
  user_id = auth.uid()
  or public.can_edit_playlist(playlist_id)
);

drop policy if exists "playlist_shares_write" on public.playlist_shares;
create policy "playlist_shares_write" on public.playlist_shares for all using (
  public.can_edit_playlist(playlist_id)
) with check (
  public.can_edit_playlist(playlist_id)
);

-- Allow anon/authenticated to read public_link by share_code (already covered by visibility)
-- Ensure songs referenced by public playlist items remain readable (existing songs_select)
