-- Versão customizada do item do repertório fica em event_songs_version
-- event_songs passa a ser só a lista (event_id, song_id, sort_order)

-- Garante nome da tabela
do $$
begin
  if to_regclass('public.song_versions') is not null
     and to_regclass('public.event_songs') is null then
    alter table public.song_versions rename to event_songs;
  end if;
end $$;

create table if not exists public.event_songs_version (
  event_songs_id uuid primary key references public.event_songs (id) on delete cascade,
  lyrics_md text not null default '',
  instructions text,
  musical_key text,
  bpm int check (bpm is null or (bpm >= 30 and bpm <= 300)),
  time_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Se a tabela já existia com coluna id, migrar para PK = event_songs_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_songs_version' and column_name = 'id'
  ) then
    alter table public.event_songs_version drop constraint if exists event_songs_version_pkey;
    alter table public.event_songs_version drop constraint if exists event_songs_version_event_songs_id_uidx;
    drop index if exists public.event_songs_version_event_songs_id_idx;
    alter table public.event_songs_version drop column id;
    alter table public.event_songs_version
      add constraint event_songs_version_pkey primary key (event_songs_id);
  end if;
end $$;

-- Migrar customizações existentes (quando diferem do catálogo)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'event_songs' and column_name = 'lyrics_md'
  ) then
    insert into public.event_songs_version (
      event_songs_id, lyrics_md, instructions, musical_key, bpm, time_signature
    )
    select
      es.id,
      coalesce(es.lyrics_md, ''),
      es.instructions,
      es.musical_key,
      case
        when es.bpm is null then null
        when es.bpm >= 30 and es.bpm <= 300 then es.bpm
        else null
      end,
      es.time_signature
    from public.event_songs es
    join public.songs s on s.id = es.song_id
    where
      coalesce(es.lyrics_md, '') is distinct from coalesce(s.lyrics_md, '')
      or es.musical_key is distinct from s.musical_key
      or es.bpm is distinct from s.bpm
      or es.time_signature is distinct from s.time_signature
      or es.instructions is distinct from s.instructions
    on conflict (event_songs_id) do nothing;
  end if;
end $$;

-- Remover colunas de versão de event_songs
alter table public.event_songs
  drop column if exists lyrics_md,
  drop column if exists instructions,
  drop column if exists musical_key,
  drop column if exists bpm,
  drop column if exists time_signature;

-- RLS
alter table public.event_songs_version enable row level security;

drop policy if exists "event_songs_version_select" on public.event_songs_version;
create policy "event_songs_version_select" on public.event_songs_version for select using (
  exists (
    select 1
    from public.event_songs es
    join public.events e on e.id = es.event_id
    where es.id = event_songs_id
      and (public.is_system_admin() or public.is_org_member(e.org_id))
  )
);

drop policy if exists "event_songs_version_write" on public.event_songs_version;
create policy "event_songs_version_write" on public.event_songs_version for all using (
  exists (
    select 1
    from public.event_songs es
    join public.events e on e.id = es.event_id
    where es.id = event_songs_id
      and (
        public.is_system_admin()
        or public.has_liturgo(e.org_id)
        or public.can_manage_church_groups(e.org_id)
      )
  )
) with check (
  exists (
    select 1
    from public.event_songs es
    join public.events e on e.id = es.event_id
    where es.id = event_songs_id
      and (
        public.is_system_admin()
        or public.has_liturgo(e.org_id)
        or public.can_manage_church_groups(e.org_id)
      )
  )
);

drop trigger if exists event_songs_version_updated_at on public.event_songs_version;
create trigger event_songs_version_updated_at before update on public.event_songs_version
  for each row execute function public.set_updated_at();
