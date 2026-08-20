-- Repertório do evento (tabela própria) separado das playlists do usuário

create table if not exists public.repertoires (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  title text not null default 'Repertório',
  service_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repertoires_event_id_uidx unique (event_id)
);

create index if not exists repertoires_org_id_idx on public.repertoires (org_id);

create table if not exists public.repertoire_items (
  id uuid primary key default gen_random_uuid(),
  repertoire_id uuid not null references public.repertoires (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  sort_order integer not null default 0,
  override_key text,
  override_bpm text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists repertoire_items_repertoire_id_idx
  on public.repertoire_items (repertoire_id, sort_order);

alter table public.schedules
  add column if not exists repertoire_id uuid references public.repertoires (id) on delete set null;

-- Migrar playlists de evento → repertoires
do $$
declare
  r record;
  v_repertoire_id uuid;
  v_event_id uuid;
begin
  for r in
    select p.*
    from public.playlists p
    where p.event_id is not null
       or p.kind = 'group_schedule'
    order by p.created_at
  loop
    v_event_id := r.event_id;

    if v_event_id is null then
      select s.event_id into v_event_id
      from public.schedules s
      where s.playlist_id = r.id
        and s.event_id is not null
      limit 1;
    end if;

    -- Sem evento vinculado: não migra (fica órfão de escala antiga)
    if v_event_id is null then
      continue;
    end if;

    -- Já existe repertório para o evento?
    select id into v_repertoire_id
    from public.repertoires
    where event_id = v_event_id
    limit 1;

    if v_repertoire_id is null then
      insert into public.repertoires (
        org_id, event_id, group_id, title, service_date, created_by, created_at
      ) values (
        r.org_id,
        v_event_id,
        r.group_id,
        coalesce(nullif(trim(r.title), ''), 'Repertório'),
        case
          when coalesce(r.purpose, '') ~ '^\d{4}-\d{2}-\d{2}' then r.purpose::date
          else null
        end,
        r.created_by,
        r.created_at
      )
      returning id into v_repertoire_id;

      insert into public.repertoire_items (
        repertoire_id, song_id, sort_order, override_key, override_bpm, notes
      )
      select
        v_repertoire_id,
        pi.song_id,
        pi.sort_order,
        pi.override_key,
        case when pi.override_bpm is null then null else pi.override_bpm::text end,
        pi.notes
      from public.playlist_items pi
      where pi.playlist_id = r.id
      order by pi.sort_order;
    end if;

    update public.schedules
    set repertoire_id = v_repertoire_id
    where playlist_id = r.id
       or event_id = v_event_id;
  end loop;

  -- Escalas com event_id sem repertoire ainda
  for r in
    select s.*
    from public.schedules s
    where s.event_id is not null
      and s.repertoire_id is null
  loop
    insert into public.repertoires (
      org_id, event_id, group_id, title, service_date, created_by
    ) values (
      r.org_id,
      r.event_id,
      r.group_id,
      coalesce('Repertório — ' || nullif(trim(r.service_type), ''), 'Repertório'),
      r.service_date,
      r.created_by
    )
    returning id into v_repertoire_id;

    update public.schedules
    set repertoire_id = v_repertoire_id
    where id = r.id;
  end loop;
end $$;

-- Remover playlists de evento (agora vivem em repertoires)
delete from public.playlists
where event_id is not null
   or kind = 'group_schedule';

update public.schedules
set playlist_id = null
where repertoire_id is not null;

drop index if exists public.playlists_event_id_uidx;
alter table public.playlists drop column if exists event_id;

-- RLS
alter table public.repertoires enable row level security;
alter table public.repertoire_items enable row level security;

drop policy if exists "repertoires_select" on public.repertoires;
create policy "repertoires_select" on public.repertoires for select using (
  public.is_system_admin()
  or public.is_org_member(org_id)
);

drop policy if exists "repertoires_write" on public.repertoires;
create policy "repertoires_write" on public.repertoires for all using (
  public.is_system_admin()
  or public.has_liturgo(org_id)
  or public.can_manage_church_groups(org_id)
) with check (
  public.is_system_admin()
  or public.has_liturgo(org_id)
  or public.can_manage_church_groups(org_id)
);

drop policy if exists "repertoire_items_select" on public.repertoire_items;
create policy "repertoire_items_select" on public.repertoire_items for select using (
  exists (
    select 1 from public.repertoires r
    where r.id = repertoire_id
      and (
        public.is_system_admin()
        or public.is_org_member(r.org_id)
      )
  )
);

drop policy if exists "repertoire_items_write" on public.repertoire_items;
create policy "repertoire_items_write" on public.repertoire_items for all using (
  exists (
    select 1 from public.repertoires r
    where r.id = repertoire_id
      and (
        public.is_system_admin()
        or public.has_liturgo(r.org_id)
        or public.can_manage_church_groups(r.org_id)
      )
  )
) with check (
  exists (
    select 1 from public.repertoires r
    where r.id = repertoire_id
      and (
        public.is_system_admin()
        or public.has_liturgo(r.org_id)
        or public.can_manage_church_groups(r.org_id)
      )
  )
);

-- RPC: cria/atualiza repertório do evento
create or replace function public.upsert_event_repertoire(
  p_org_id uuid,
  p_event_id uuid,
  p_title text,
  p_date text default null,
  p_song_ids uuid[] default '{}',
  p_group_id uuid default null,
  p_repertoire_id uuid default null,
  p_replace_songs boolean default true
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

  if p_org_id is null or p_event_id is null or coalesce(trim(p_title), '') = '' then
    raise exception 'Organização, evento e título são obrigatórios';
  end if;

  if not (
    public.is_system_admin()
    or public.has_liturgo(p_org_id)
    or public.can_manage_church_groups(p_org_id)
    or (p_group_id is not null and public.can_manage_group(p_group_id))
    or public.is_org_member(p_org_id)
  ) then
    raise exception 'Sem permissão para salvar repertório do evento';
  end if;

  if p_repertoire_id is not null then
    update public.repertoires
    set
      org_id = p_org_id,
      event_id = p_event_id,
      group_id = p_group_id,
      title = trim(p_title),
      service_date = case
        when coalesce(p_date, '') ~ '^\d{4}-\d{2}-\d{2}' then p_date::date
        else service_date
      end,
      updated_at = now(),
      created_by = coalesce(created_by, v_uid)
    where id = p_repertoire_id
    returning id into v_id;
  end if;

  if v_id is null then
    select id into v_id from public.repertoires where event_id = p_event_id limit 1;
    if v_id is not null then
      update public.repertoires
      set
        org_id = p_org_id,
        group_id = p_group_id,
        title = trim(p_title),
        service_date = case
          when coalesce(p_date, '') ~ '^\d{4}-\d{2}-\d{2}' then p_date::date
          else service_date
        end,
        updated_at = now(),
        created_by = coalesce(created_by, v_uid)
      where id = v_id;
    end if;
  end if;

  if v_id is null then
    insert into public.repertoires (
      org_id, event_id, group_id, title, service_date, created_by
    ) values (
      p_org_id,
      p_event_id,
      p_group_id,
      trim(p_title),
      case
        when coalesce(p_date, '') ~ '^\d{4}-\d{2}-\d{2}' then p_date::date
        else null
      end,
      v_uid
    )
    returning id into v_id;
  end if;

  if p_replace_songs then
    delete from public.repertoire_items where repertoire_id = v_id;

    if cardinality(v_songs) > 0 then
      for i in 1..cardinality(v_songs) loop
        insert into public.repertoire_items (repertoire_id, song_id, sort_order)
        values (v_id, v_songs[i], i - 1);
      end loop;
    end if;
  end if;

  update public.schedules
  set repertoire_id = v_id, playlist_id = null
  where event_id = p_event_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_event_repertoire(uuid, uuid, text, text, uuid[], uuid, uuid, boolean) from public;
grant execute on function public.upsert_event_repertoire(uuid, uuid, text, text, uuid[], uuid, uuid, boolean) to authenticated;

-- Descontinua RPC antiga de playlist de escala
drop function if exists public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid, uuid);
drop function if exists public.upsert_schedule_playlist(uuid, text, text, uuid[], uuid, uuid);
