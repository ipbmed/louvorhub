-- Repertório do evento = song_versions (remove repertoires / repertoire_items)

-- 1) Novas colunas
alter table public.song_versions
  add column if not exists event_id uuid references public.events (id) on delete cascade,
  add column if not exists sort_order integer not null default 0;

-- 2) Backfill event_id a partir de repertoires
update public.song_versions sv
set event_id = r.event_id
from public.repertoires r
where sv.repertoire_id = r.id
  and sv.event_id is null;

-- 3) Itens do repertório sem versão ainda → cria song_versions
do $$
begin
  if to_regclass('public.repertoire_items') is null then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'song_versions' and column_name = 'time_signature'
  ) then
    insert into public.song_versions (song_id, event_id, repertoire_id, lyrics_md, musical_key, bpm, time_signature, instructions, sort_order)
    select
      ri.song_id,
      r.event_id,
      r.id,
      coalesce(s.lyrics_md, ''),
      s.musical_key,
      s.bpm,
      s.time_signature,
      s.instructions,
      ri.sort_order
    from public.repertoire_items ri
    join public.repertoires r on r.id = ri.repertoire_id
    join public.songs s on s.id = ri.song_id
    where r.event_id is not null
      and not exists (
        select 1 from public.song_versions sv
        where sv.song_id = ri.song_id
          and (sv.event_id = r.event_id or sv.repertoire_id = r.id)
      );
  else
    insert into public.song_versions (song_id, event_id, repertoire_id, lyrics_md, musical_key, bpm, instructions, sort_order)
    select
      ri.song_id,
      r.event_id,
      r.id,
      coalesce(s.lyrics_md, ''),
      s.musical_key,
      s.bpm,
      s.instructions,
      ri.sort_order
    from public.repertoire_items ri
    join public.repertoires r on r.id = ri.repertoire_id
    join public.songs s on s.id = ri.song_id
    where r.event_id is not null
      and not exists (
        select 1 from public.song_versions sv
        where sv.song_id = ri.song_id
          and (sv.event_id = r.event_id or sv.repertoire_id = r.id)
      );
  end if;
end $$;

-- 4) Garantir event_id preenchido onde possível
update public.song_versions sv
set event_id = r.event_id
from public.repertoires r
where sv.event_id is null
  and sv.repertoire_id = r.id;

-- Remove linhas órfãs sem evento
delete from public.song_versions where event_id is null;

alter table public.song_versions
  alter column event_id set not null;

-- 5) Trocar unique/index de repertoire_id → event_id
alter table public.song_versions
  drop constraint if exists song_versions_song_id_repertoire_id_key;

create unique index if not exists song_versions_event_song_uidx
  on public.song_versions (event_id, song_id);

create index if not exists song_versions_event_id_order_idx
  on public.song_versions (event_id, sort_order);

-- 6) schedules deixa de apontar para repertoires
alter table public.schedules
  drop constraint if exists schedules_repertoire_id_fkey;

alter table public.schedules
  drop column if exists repertoire_id;

-- 7) Dropar policies que dependem de repertoire_id ANTES de dropar a coluna
drop policy if exists "song_versions_select" on public.song_versions;
drop policy if exists "song_versions_write" on public.song_versions;

drop function if exists public.upsert_event_repertoire(uuid, uuid, text, text, uuid[], uuid, uuid, boolean);

alter table public.song_versions
  drop column if exists repertoire_id;

drop table if exists public.repertoire_items cascade;
drop table if exists public.repertoires cascade;

-- 8) RLS por evento/org (recria após remover repertoire_id)
alter table public.song_versions enable row level security;

create policy "song_versions_select" on public.song_versions for select using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.is_system_admin() or public.is_org_member(e.org_id))
  )
);

create policy "song_versions_write" on public.song_versions for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (
        public.is_system_admin()
        or public.has_liturgo(e.org_id)
        or public.can_manage_church_groups(e.org_id)
      )
  )
) with check (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (
        public.is_system_admin()
        or public.has_liturgo(e.org_id)
        or public.can_manage_church_groups(e.org_id)
      )
  )
);
