-- 1) is_group_member: status foi removido de group_members
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
  );
$$;

-- 2) Insert de playlist mais permissivo para autenticados da org
drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert to authenticated
  with check (
    public.is_system_admin()
    or created_by = auth.uid()
  );

-- 3) RPC security definer: cria/atualiza repertório da escala sem depender do SELECT pós-insert
create or replace function public.upsert_schedule_playlist(
  p_org_id uuid,
  p_title text,
  p_date text,
  p_song_ids uuid[] default '{}',
  p_group_id uuid default null,
  p_playlist_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_songs uuid[] := coalesce(p_song_ids, '{}');
  i int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_org_id is null or coalesce(trim(p_title), '') = '' then
    raise exception 'Organização e título são obrigatórios';
  end if;

  if not (
    public.is_system_admin()
    or public.can_manage_church_groups(p_org_id)
    or (p_group_id is not null and public.can_manage_group(p_group_id))
    or public.is_org_member(p_org_id)
  ) then
    raise exception 'Sem permissão para salvar repertório da escala';
  end if;

  if p_playlist_id is not null then
    update public.playlists
    set
      org_id = p_org_id,
      group_id = p_group_id,
      title = trim(p_title),
      purpose = nullif(trim(coalesce(p_date, '')), ''),
      visibility = 'private',
      kind = 'group_schedule',
      is_permanent = true,
      created_by = coalesce(created_by, v_uid)
    where id = p_playlist_id
    returning id into v_id;
  end if;

  if v_id is null then
    insert into public.playlists (
      org_id,
      group_id,
      created_by,
      title,
      purpose,
      visibility,
      kind,
      is_permanent
    ) values (
      p_org_id,
      p_group_id,
      v_uid,
      trim(p_title),
      nullif(trim(coalesce(p_date, '')), ''),
      'private',
      'group_schedule',
      true
    )
    returning id into v_id;
  end if;

  delete from public.playlist_items where playlist_id = v_id;

  if cardinality(v_songs) > 0 then
    for i in 1..cardinality(v_songs) loop
      insert into public.playlist_items (playlist_id, song_id, sort_order)
      values (v_id, v_songs[i], i - 1);
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid) from public;
grant execute on function public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid) to authenticated;
