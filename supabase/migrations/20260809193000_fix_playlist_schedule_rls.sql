-- Corrige RLS: criar repertório automático ao salvar escala
-- e permitir quem gerencia igreja/grupo gravar escalas.

-- 1) Inserção de playlists: criador (membro da org) ou admin;
--    group_schedule também para quem gerencia o grupo/igreja.
drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert to authenticated
  with check (
    public.is_system_admin()
    or (
      created_by = auth.uid()
      and (
        org_id is null
        or public.is_org_member(org_id)
        or public.can_manage_church_groups(org_id)
      )
    )
  );

-- 2) Update/delete alinhados com can_edit_playlist
drop policy if exists "playlists_update" on public.playlists;
create policy "playlists_update" on public.playlists for update using (
  public.can_edit_playlist(id)
) with check (
  public.can_edit_playlist(id)
);

drop policy if exists "playlists_delete" on public.playlists;
create policy "playlists_delete" on public.playlists for delete using (
  public.can_edit_playlist(id)
);

-- 3) Itens do repertório
drop policy if exists "playlist_items_write" on public.playlist_items;
create policy "playlist_items_write" on public.playlist_items for all using (
  public.can_edit_playlist(playlist_id)
) with check (
  public.can_edit_playlist(playlist_id)
);

-- 4) Escalas: admin, editor da igreja ou editor do grupo
drop policy if exists "schedules_write" on public.schedules;
create policy "schedules_write" on public.schedules for all using (
  public.is_system_admin()
  or public.can_manage_church_groups(org_id)
  or (group_id is not null and public.can_manage_group(group_id))
) with check (
  public.is_system_admin()
  or public.can_manage_church_groups(org_id)
  or (group_id is not null and public.can_manage_group(group_id))
);

drop policy if exists "schedule_assignments_write" on public.schedule_assignments;
create policy "schedule_assignments_write" on public.schedule_assignments for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and (
        public.is_system_admin()
        or public.can_manage_church_groups(s.org_id)
        or (s.group_id is not null and public.can_manage_group(s.group_id))
      )
  )
) with check (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and (
        public.is_system_admin()
        or public.can_manage_church_groups(s.org_id)
        or (s.group_id is not null and public.can_manage_group(s.group_id))
      )
  )
);

drop policy if exists "schedule_songs_write" on public.schedule_songs;
create policy "schedule_songs_write" on public.schedule_songs for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and (
        public.is_system_admin()
        or public.can_manage_church_groups(s.org_id)
        or (s.group_id is not null and public.can_manage_group(s.group_id))
      )
  )
) with check (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and (
        public.is_system_admin()
        or public.can_manage_church_groups(s.org_id)
        or (s.group_id is not null and public.can_manage_group(s.group_id))
      )
  )
);
