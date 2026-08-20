-- Link público do repertório do evento (leitura anônima via RPC)

alter table public.events
  add column if not exists share_code text,
  add column if not exists share_enabled boolean not null default false;

update public.events
set share_code = encode(extensions.gen_random_bytes(8), 'hex')
where share_code is null;

alter table public.events
  alter column share_code set default encode(extensions.gen_random_bytes(8), 'hex');

alter table public.events
  alter column share_code set not null;

create unique index if not exists events_share_code_uidx on public.events (share_code);

create or replace function public.get_public_event_repertoire(p_share_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_songs jsonb;
begin
  if p_share_code is null or length(trim(p_share_code)) < 8 then
    return null;
  end if;

  select * into v_event
  from public.events e
  where e.share_code = trim(p_share_code)
    and e.share_enabled = true
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.sort_order), '[]'::jsonb)
  into v_songs
  from (
    select
      es.id as event_song_id,
      es.song_id,
      es.sort_order,
      s.title,
      s.subtitle,
      s.kind,
      s.number,
      h.name as hymnal,
      coalesce(esv.lyrics_md, s.lyrics_md, '') as lyrics_md,
      coalesce(esv.musical_key, s.musical_key) as musical_key,
      coalesce(esv.bpm, s.bpm) as bpm,
      coalesce(esv.time_signature, s.time_signature) as time_signature,
      coalesce(esv.instructions, s.instructions) as instructions,
      (esv.event_songs_id is not null) as has_version
    from public.event_songs es
    join public.songs s on s.id = es.song_id
    left join public.hymnals h on h.id = s.hymnal_id
    left join public.event_songs_version esv on esv.event_songs_id = es.id
    where es.event_id = v_event.id
  ) x;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.service_date,
      'time', v_event.service_time,
      'theme', v_event.theme,
      'share_code', v_event.share_code
    ),
    'songs', v_songs
  );
end;
$$;

revoke all on function public.get_public_event_repertoire(text) from public;
grant execute on function public.get_public_event_repertoire(text) to anon, authenticated;
