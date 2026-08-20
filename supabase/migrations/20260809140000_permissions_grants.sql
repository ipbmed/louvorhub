-- =============================================================================
-- Permissions model: global is_admin + resource_grants (editors + liturgo)
-- =============================================================================

-- 1) Global admin flag
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) Grant roles
do $$ begin
  create type public.grant_role as enum ('church_editor', 'group_editor', 'liturgo');
exception when duplicate_object then null;
end $$;

create table if not exists public.resource_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.grant_role not null,
  org_id uuid references public.organizations (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint resource_grants_scope_check check (
    (role = 'church_editor' and org_id is not null and group_id is null)
    or (role = 'liturgo' and org_id is not null and group_id is null)
    or (role = 'group_editor' and group_id is not null)
  )
);

-- Unique grants (nulls distinct for group_id/org_id combinations)
create unique index if not exists resource_grants_user_role_org_uidx
  on public.resource_grants (user_id, role, org_id)
  where group_id is null;

create unique index if not exists resource_grants_user_role_group_uidx
  on public.resource_grants (user_id, role, group_id)
  where group_id is not null;

create index if not exists resource_grants_user_id_idx on public.resource_grants (user_id);
create index if not exists resource_grants_org_id_idx on public.resource_grants (org_id);
create index if not exists resource_grants_group_id_idx on public.resource_grants (group_id);

-- 3) Helper functions
create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  );
$$;

create or replace function public.has_church_editor(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin()
    or exists (
      select 1 from public.resource_grants g
      where g.user_id = auth.uid()
        and g.role = 'church_editor'
        and g.org_id = p_org_id
    );
$$;

create or replace function public.has_group_editor(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin()
    or exists (
      select 1 from public.resource_grants g
      where g.user_id = auth.uid()
        and g.role = 'group_editor'
        and g.group_id = p_group_id
    );
$$;

create or replace function public.has_liturgo(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin()
    or exists (
      select 1 from public.resource_grants g
      where g.user_id = auth.uid()
        and g.role = 'liturgo'
        and g.org_id = p_org_id
    );
$$;

create or replace function public.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin()
    or public.has_group_editor(p_group_id)
    or exists (
      select 1
      from public.groups gr
      where gr.id = p_group_id
        and public.has_church_editor(gr.org_id)
    );
$$;

create or replace function public.can_manage_church_groups(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_admin() or public.has_church_editor(p_org_id);
$$;

-- 4) Migrate legacy membership roles → grants / is_admin
update public.profiles p
set is_admin = true
where exists (
  select 1 from public.memberships m
  where m.user_id = p.id and m.role = 'owner'
);

insert into public.resource_grants (user_id, role, org_id)
select distinct m.user_id, 'church_editor'::public.grant_role, m.org_id
from public.memberships m
where m.role in ('owner', 'admin', 'leader')
  and not exists (
    select 1 from public.resource_grants g
    where g.user_id = m.user_id
      and g.role = 'church_editor'
      and g.org_id = m.org_id
  );

-- 5) RLS for resource_grants
alter table public.resource_grants enable row level security;

drop policy if exists "resource_grants_select" on public.resource_grants;
create policy "resource_grants_select" on public.resource_grants for select using (
  public.is_system_admin()
  or user_id = auth.uid()
  or public.is_org_member(org_id)
  or exists (
    select 1 from public.groups gr
    where gr.id = group_id and public.is_org_member(gr.org_id)
  )
);

drop policy if exists "resource_grants_write" on public.resource_grants;
create policy "resource_grants_write" on public.resource_grants for all using (
  public.is_system_admin()
) with check (
  public.is_system_admin()
);

-- Admins can update any profile (incl. is_admin)
drop policy if exists "profiles_update_system_admin" on public.profiles;
create policy "profiles_update_system_admin" on public.profiles for update using (
  public.is_system_admin()
);

-- Replace org-manager profile update: admin or church_editor of shared org
drop policy if exists "profiles_update_org_managers" on public.profiles;
create policy "profiles_update_org_managers" on public.profiles for update using (
  public.is_system_admin()
  or exists (
    select 1
    from public.memberships m_target
    where m_target.user_id = profiles.id
      and public.has_church_editor(m_target.org_id)
  )
);

-- 6) Organizations: admin only for mutate
drop policy if exists "orgs_update" on public.organizations;
create policy "orgs_update" on public.organizations for update using (
  public.is_system_admin()
);

drop policy if exists "orgs_delete" on public.organizations;
create policy "orgs_delete" on public.organizations for delete using (
  public.is_system_admin()
);

drop policy if exists "orgs_insert" on public.organizations;
create policy "orgs_insert" on public.organizations for insert to authenticated
  with check (public.is_system_admin());

-- 7) Memberships: admin manages; users still insert self as member
drop policy if exists "memberships_insert_self" on public.memberships;
create policy "memberships_insert_self" on public.memberships for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_system_admin()
  );

drop policy if exists "memberships_update" on public.memberships;
create policy "memberships_update" on public.memberships for update using (
  public.is_system_admin()
);

drop policy if exists "memberships_delete" on public.memberships;
create policy "memberships_delete" on public.memberships for delete using (
  user_id = auth.uid()
  or public.is_system_admin()
);

-- 8) Groups / group_members
drop policy if exists "groups_write" on public.groups;
drop policy if exists "groups_insert" on public.groups;
drop policy if exists "groups_update" on public.groups;
drop policy if exists "groups_delete" on public.groups;
create policy "groups_insert" on public.groups for insert to authenticated
  with check (public.can_manage_church_groups(org_id));
create policy "groups_update" on public.groups for update using (
  public.can_manage_group(id)
) with check (
  public.can_manage_church_groups(org_id) or public.has_group_editor(id)
);
create policy "groups_delete" on public.groups for delete using (
  public.can_manage_church_groups(org_id) or public.has_group_editor(id)
);

drop policy if exists "group_members_write" on public.group_members;
create policy "group_members_write" on public.group_members for all using (
  public.can_manage_group(group_id)
) with check (
  public.can_manage_group(group_id)
);

-- 9) Liturgies: admin or liturgo
drop policy if exists "liturgies_write" on public.liturgies;
create policy "liturgies_write" on public.liturgies for all using (
  public.has_liturgo(org_id)
) with check (
  public.has_liturgo(org_id)
);

drop policy if exists "liturgy_items_write" on public.liturgy_items;
create policy "liturgy_items_write" on public.liturgy_items for all using (
  exists (
    select 1 from public.liturgies l
    where l.id = liturgy_id and public.has_liturgo(l.org_id)
  )
) with check (
  exists (
    select 1 from public.liturgies l
    where l.id = liturgy_id and public.has_liturgo(l.org_id)
  )
);

-- 10) Songs / categories / schedules: system admin only (this phase)
drop policy if exists "songs_insert" on public.songs;
create policy "songs_insert" on public.songs for insert to authenticated
  with check (
    public.is_system_admin()
    or (
      org_id is not null
      and public.is_system_admin()
    )
  );

drop policy if exists "songs_update" on public.songs;
create policy "songs_update" on public.songs for update using (
  public.is_system_admin()
);

drop policy if exists "songs_delete" on public.songs;
create policy "songs_delete" on public.songs for delete using (
  public.is_system_admin()
);

drop policy if exists "song_links_write" on public.song_links;
create policy "song_links_write" on public.song_links for all using (
  exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_system_admin()
  )
);

drop policy if exists "song_versions_write" on public.song_versions;
create policy "song_versions_write" on public.song_versions for all using (
  exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_system_admin()
  )
);

drop policy if exists "song_version_links_write" on public.song_version_links;
create policy "song_version_links_write" on public.song_version_links for all using (
  exists (
    select 1
    from public.song_versions sv
    join public.songs s on s.id = sv.song_id
    where sv.id = version_id and public.is_system_admin()
  )
);

drop policy if exists "categories_write" on public.categories;
create policy "categories_write" on public.categories for all using (
  public.is_system_admin()
) with check (
  public.is_system_admin()
);

drop policy if exists "schedules_write" on public.schedules;
create policy "schedules_write" on public.schedules for all using (
  public.is_system_admin()
) with check (
  public.is_system_admin()
);

drop policy if exists "schedule_assignments_write" on public.schedule_assignments;
create policy "schedule_assignments_write" on public.schedule_assignments for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_system_admin()
  )
);

drop policy if exists "schedule_songs_write" on public.schedule_songs;
create policy "schedule_songs_write" on public.schedule_songs for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_system_admin()
  )
);

drop policy if exists "schedule_assignments_self_update" on public.schedule_assignments;
create policy "schedule_assignments_self_update" on public.schedule_assignments for update using (
  user_id = auth.uid()
  or exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.is_system_admin()
  )
);

-- Playlists write: admin (creators still covered by created_by clauses where present)
drop policy if exists "playlists_update" on public.playlists;
create policy "playlists_update" on public.playlists for update using (
  created_by = auth.uid()
  or public.is_system_admin()
);

drop policy if exists "playlists_delete" on public.playlists;
create policy "playlists_delete" on public.playlists for delete using (
  created_by = auth.uid()
  or public.is_system_admin()
);

drop policy if exists "playlist_items_write" on public.playlist_items;
create policy "playlist_items_write" on public.playlist_items for all using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_id
      and (p.created_by = auth.uid() or public.is_system_admin())
  )
);

-- Storage: admin for org logos / song assets write
drop policy if exists "org_logos_member_write" on storage.objects;
create policy "org_logos_member_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.is_system_admin()
  );

drop policy if exists "org_logos_member_update" on storage.objects;
create policy "org_logos_member_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_system_admin()
  );

drop policy if exists "org_logos_member_delete" on storage.objects;
create policy "org_logos_member_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_system_admin()
  );

drop policy if exists "song_assets_leader_write" on storage.objects;
create policy "song_assets_leader_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'song-assets'
    and public.is_system_admin()
  );
