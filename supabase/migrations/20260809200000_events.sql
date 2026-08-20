-- Eventos: pai de escala, liturgia e repertório do culto

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null default 'Culto',
  service_date date not null,
  service_time text,
  service_type text,
  theme text,
  notes text,
  group_id uuid references public.groups (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_org_date_idx on public.events (org_id, service_date);

alter table public.schedules
  add column if not exists event_id uuid references public.events (id) on delete cascade;

alter table public.liturgies
  add column if not exists event_id uuid references public.events (id) on delete set null;

alter table public.playlists
  add column if not exists event_id uuid references public.events (id) on delete set null;

create unique index if not exists schedules_event_id_uidx
  on public.schedules (event_id) where event_id is not null;

create unique index if not exists liturgies_event_id_uidx
  on public.liturgies (event_id) where event_id is not null;

create unique index if not exists playlists_event_id_uidx
  on public.playlists (event_id) where event_id is not null;

-- Backfill: um evento por escala existente (com vínculo direto)
do $$
declare
  r record;
  v_event_id uuid;
begin
  for r in
    select * from public.schedules where event_id is null order by created_at
  loop
    insert into public.events (
      org_id, title, service_date, service_time, service_type, theme, notes, group_id, created_by, created_at
    ) values (
      r.org_id,
      coalesce(nullif(trim(r.title), ''), nullif(trim(r.service_type), ''), 'Culto'),
      r.service_date,
      r.service_time,
      r.service_type,
      r.theme,
      r.notes,
      r.group_id,
      r.created_by,
      r.created_at
    )
    returning id into v_event_id;

    update public.schedules set event_id = v_event_id where id = r.id;

    if r.playlist_id is not null then
      update public.playlists
      set event_id = v_event_id
      where id = r.playlist_id and event_id is null;
    end if;
  end loop;

  -- Liturgias sem evento: anexar a evento da mesma data/org livre, ou criar novo
  for r in
    select * from public.liturgies where event_id is null order by created_at
  loop
    select e.id into v_event_id
    from public.events e
    where e.org_id = r.org_id
      and e.service_date = coalesce(r.service_date, e.service_date)
      and not exists (select 1 from public.liturgies l2 where l2.event_id = e.id)
    order by e.created_at
    limit 1;

    if v_event_id is null then
      insert into public.events (
        org_id, title, service_date, theme, notes, created_by, created_at
      ) values (
        r.org_id,
        coalesce(nullif(trim(r.title), ''), 'Culto'),
        coalesce(r.service_date, current_date),
        r.theme,
        r.notes,
        r.created_by,
        r.created_at
      )
      returning id into v_event_id;
    end if;

    update public.liturgies set event_id = v_event_id where id = r.id;
  end loop;
end $$;

-- RLS
alter table public.events enable row level security;

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select using (
  public.is_system_admin()
  or public.is_org_member(org_id)
);

drop policy if exists "events_write" on public.events;
create policy "events_write" on public.events for all using (
  public.is_system_admin()
  or public.has_liturgo(org_id)
  or public.can_manage_church_groups(org_id)
) with check (
  public.is_system_admin()
  or public.has_liturgo(org_id)
  or public.can_manage_church_groups(org_id)
);

-- Escalas ligadas a eventos: mesma regra de escrita dos eventos
drop policy if exists "schedules_write" on public.schedules;
create policy "schedules_write" on public.schedules for all using (
  public.is_system_admin()
  or public.has_liturgo(org_id)
  or public.can_manage_church_groups(org_id)
) with check (
  public.is_system_admin()
  or public.has_liturgo(org_id)
  or public.can_manage_church_groups(org_id)
);

drop policy if exists "schedule_assignments_write" on public.schedule_assignments;
create policy "schedule_assignments_write" on public.schedule_assignments for all using (
  exists (
    select 1 from public.schedules s
    where s.id = schedule_id
      and (
        public.is_system_admin()
        or public.has_liturgo(s.org_id)
        or public.can_manage_church_groups(s.org_id)
      )
  )
);

-- RPC: repertório do evento/escala com event_id
drop function if exists public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid);

create or replace function public.upsert_schedule_playlist(
  p_org_id uuid,
  p_title text,
  p_date text,
  p_song_ids uuid[] default '{}',
  p_group_id uuid default null,
  p_playlist_id uuid default null,
  p_event_id uuid default null
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
    raise exception 'Sem permissão para salvar repertório do evento';
  end if;

  if p_playlist_id is not null then
    update public.playlists
    set
      org_id = p_org_id,
      group_id = p_group_id,
      event_id = coalesce(p_event_id, event_id),
      title = trim(p_title),
      purpose = nullif(trim(coalesce(p_date, '')), ''),
      visibility = 'private',
      kind = 'group_schedule',
      is_permanent = true,
      created_by = coalesce(created_by, v_uid)
    where id = p_playlist_id
    returning id into v_id;
  end if;

  if v_id is null and p_event_id is not null then
    select id into v_id from public.playlists where event_id = p_event_id limit 1;
    if v_id is not null then
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
      where id = v_id;
    end if;
  end if;

  if v_id is null then
    insert into public.playlists (
      org_id,
      group_id,
      event_id,
      created_by,
      title,
      purpose,
      visibility,
      kind,
      is_permanent
    ) values (
      p_org_id,
      p_group_id,
      p_event_id,
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

revoke all on function public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid, uuid) from public;
grant execute on function public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid, uuid) to authenticated;
