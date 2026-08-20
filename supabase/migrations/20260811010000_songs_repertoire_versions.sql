-- Remodelagem: songs = catálogo; song_versions = versão por repertório
-- Idempotente o suficiente para retomar após falha parcial.

-- 1) Hinários
create table if not exists public.hymnals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'songs' and column_name = 'hymnal'
  ) then
    insert into public.hymnals (name)
    select distinct trim(hymnal)
    from public.songs
    where hymnal is not null and trim(hymnal) <> ''
    on conflict (name) do nothing;
  end if;
end $$;

insert into public.hymnals (name)
values ('Novo Cântico')
on conflict (name) do nothing;

alter table public.hymnals enable row level security;

drop policy if exists "hymnals_select" on public.hymnals;
create policy "hymnals_select" on public.hymnals for select using (true);

drop policy if exists "hymnals_insert" on public.hymnals;
create policy "hymnals_insert" on public.hymnals for insert to authenticated
  with check (true);

drop policy if exists "hymnals_update" on public.hymnals;
create policy "hymnals_update" on public.hymnals for update using (
  public.is_system_admin()
);

drop policy if exists "hymnals_delete" on public.hymnals;
create policy "hymnals_delete" on public.hymnals for delete using (
  public.is_system_admin()
);

-- 2) Novas colunas em songs
alter table public.songs
  add column if not exists hymnal_id uuid references public.hymnals (id) on delete set null,
  add column if not exists musical_key text,
  add column if not exists bpm int,
  add column if not exists author text,
  add column if not exists composition text,
  add column if not exists instructions text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'songs_bpm_check' and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_bpm_check check (bpm is null or (bpm >= 30 and bpm <= 300));
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'songs' and column_name = 'hymnal'
  ) then
    update public.songs s
    set hymnal_id = h.id
    from public.hymnals h
    where s.hymnal is not null
      and trim(s.hymnal) = h.name
      and s.hymnal_id is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'songs' and column_name = 'artist'
  ) then
    update public.songs s
    set author = coalesce(s.author, s.artist);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'songs' and column_name = 'composer'
  ) then
    update public.songs s
    set composition = coalesce(s.composition, s.composer);
  end if;
end $$;

-- Migrar cifra/tom/BPM da versão-catálogo antiga (só se song_versions ainda for o schema antigo)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'song_versions'
      and column_name = 'lyrics_chords'
  ) then
    update public.songs s
    set
      musical_key = coalesce(s.musical_key, v.musical_key),
      bpm = coalesce(s.bpm, v.bpm),
      lyrics_md = case
        when coalesce(nullif(trim(v.lyrics_chords), ''), '') <> '' then v.lyrics_chords
        else s.lyrics_md
      end,
      instructions = coalesce(
        s.instructions,
        nullif(array_to_string(v.instructions, E'\n'), '')
      )
    from (
      select distinct on (song_id)
        song_id, musical_key, bpm, lyrics_chords, instructions
      from public.song_versions
      order by song_id, sort_order, version_key
    ) v
    where v.song_id = s.id;
  end if;
end $$;

-- 3) Recriar song_versions como versão de repertório (se ainda não estiver no schema novo)
drop table if exists public.song_version_links cascade;

do $$
begin
  if to_regclass('public.schedule_songs') is not null then
    create temporary table if not exists _schedule_song_mig (
      song_id uuid,
      repertoire_id uuid,
      lyrics_md text,
      musical_key text,
      bpm int,
      instructions text
    ) on commit drop;

    delete from _schedule_song_mig;

    insert into _schedule_song_mig (song_id, repertoire_id, lyrics_md, musical_key, bpm, instructions)
    select
      ss.song_id,
      sch.repertoire_id,
      coalesce(nullif(trim(ss.lyrics_chords), ''), ''),
      ss.musical_key,
      case when ss.bpm ~ '^[0-9]+$' then ss.bpm::int else null end,
      coalesce(ss.notes, '')
    from public.schedule_songs ss
    join public.schedules sch on sch.id = ss.schedule_id
    where sch.repertoire_id is not null
      and ss.is_customized = true;
  else
    create temporary table if not exists _schedule_song_mig (
      song_id uuid,
      repertoire_id uuid,
      lyrics_md text,
      musical_key text,
      bpm int,
      instructions text
    ) on commit drop;
  end if;
end $$;

do $$
begin
  -- Schema antigo ainda tem version_key; schema novo tem repertoire_id
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'song_versions' and column_name = 'version_key'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'song_versions' and column_name = 'repertoire_id'
  ) then
    drop table if exists public.song_versions cascade;

    create table public.song_versions (
      id uuid primary key default gen_random_uuid(),
      song_id uuid not null references public.songs (id) on delete cascade,
      repertoire_id uuid not null references public.repertoires (id) on delete cascade,
      lyrics_md text not null default '',
      musical_key text,
      bpm int check (bpm is null or (bpm >= 30 and bpm <= 300)),
      instructions text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (song_id, repertoire_id)
    );

    create index song_versions_repertoire_id_idx on public.song_versions (repertoire_id);
    create index song_versions_song_id_idx on public.song_versions (song_id);
  end if;
end $$;

insert into public.song_versions (song_id, repertoire_id, lyrics_md, musical_key, bpm, instructions)
select song_id, repertoire_id, lyrics_md, musical_key, bpm, nullif(instructions, '')
from _schedule_song_mig
where repertoire_id is not null
on conflict (song_id, repertoire_id) do nothing;

drop table if exists public.schedule_songs cascade;

alter table public.song_versions enable row level security;

drop policy if exists "song_versions_select" on public.song_versions;
create policy "song_versions_select" on public.song_versions for select using (
  exists (
    select 1 from public.repertoires r
    where r.id = repertoire_id
      and (public.is_system_admin() or public.is_org_member(r.org_id))
  )
);

drop policy if exists "song_versions_write" on public.song_versions;
create policy "song_versions_write" on public.song_versions for all using (
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

drop trigger if exists song_versions_updated_at on public.song_versions;
create trigger song_versions_updated_at before update on public.song_versions
  for each row execute function public.set_updated_at();

-- 4) Dropar policies que dependem de org_id / is_public ANTES de dropar colunas
drop policy if exists "songs_select" on public.songs;
drop policy if exists "songs_insert" on public.songs;
drop policy if exists "songs_update" on public.songs;
drop policy if exists "songs_delete" on public.songs;
drop policy if exists "song_links_select" on public.song_links;
drop policy if exists "song_links_write" on public.song_links;

alter table public.songs drop constraint if exists songs_org_id_slug_key;
alter table public.songs drop constraint if exists songs_hino_number;

drop index if exists public.songs_org_id_idx;

alter table public.songs
  drop column if exists org_id,
  drop column if exists slug,
  drop column if exists artist,
  drop column if exists is_public,
  drop column if exists source_song_id,
  drop column if exists category_id,
  drop column if exists hymnal,
  drop column if exists composer,
  drop column if exists time_signature;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'songs_hino_number' and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_hino_number check (
        (kind = 'hino' and number is not null) or (kind = 'cantico' and number is null)
      );
  end if;
end $$;

-- RLS songs: catálogo legível; escrita admin
create policy "songs_select" on public.songs for select using (true);

create policy "songs_insert" on public.songs for insert to authenticated
  with check (public.is_system_admin());

create policy "songs_update" on public.songs for update using (public.is_system_admin());

create policy "songs_delete" on public.songs for delete using (public.is_system_admin());

create policy "song_links_write" on public.song_links for all using (
  public.is_system_admin()
) with check (
  public.is_system_admin()
);

create policy "song_links_select" on public.song_links for select using (true);

-- 5) Apagar tabelas legadas
drop table if exists public.playlist_edition_items cascade;
drop table if exists public.playlist_editions cascade;
drop table if exists public.playlist_comments cascade;
