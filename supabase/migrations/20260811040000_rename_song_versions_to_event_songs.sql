-- Renomeia song_versions → event_songs (repertório do evento)

do $$
begin
  if to_regclass('public.song_versions') is not null
     and to_regclass('public.event_songs') is null then
    alter table public.song_versions rename to event_songs;
  end if;
end $$;

-- Índices
alter index if exists public.song_versions_repertoire_id_idx rename to event_songs_repertoire_id_idx;
alter index if exists public.song_versions_song_id_idx rename to event_songs_song_id_idx;
alter index if exists public.song_versions_event_song_uidx rename to event_songs_event_song_uidx;
alter index if exists public.song_versions_event_id_order_idx rename to event_songs_event_id_order_idx;

-- Trigger
drop trigger if exists song_versions_updated_at on public.event_songs;
drop trigger if exists event_songs_updated_at on public.event_songs;
create trigger event_songs_updated_at before update on public.event_songs
  for each row execute function public.set_updated_at();

-- RLS policies (recria com nomes novos)
alter table public.event_songs enable row level security;

drop policy if exists "song_versions_select" on public.event_songs;
drop policy if exists "song_versions_write" on public.event_songs;
drop policy if exists "event_songs_select" on public.event_songs;
drop policy if exists "event_songs_write" on public.event_songs;

create policy "event_songs_select" on public.event_songs for select using (
  exists (
    select 1 from public.events e
    where e.id = event_id
      and (public.is_system_admin() or public.is_org_member(e.org_id))
  )
);

create policy "event_songs_write" on public.event_songs for all using (
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
