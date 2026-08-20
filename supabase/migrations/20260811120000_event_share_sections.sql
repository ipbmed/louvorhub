-- Compartilhamento configurável do evento: músicas, liturgia e escala

alter table public.events
  add column if not exists share_include_songs boolean not null default true,
  add column if not exists share_include_liturgy boolean not null default true,
  add column if not exists share_include_team boolean not null default false;

create or replace function public.get_public_event(p_share_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_songs jsonb := '[]'::jsonb;
  v_liturgy jsonb := null;
  v_team jsonb := '[]'::jsonb;
  v_liturgy_id uuid;
  v_schedule_id uuid;
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

  if v_event.share_include_songs then
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
  end if;

  if v_event.share_include_liturgy then
    select l.id into v_liturgy_id
    from public.liturgies l
    where l.event_id = v_event.id
    limit 1;

    if v_liturgy_id is not null then
      select jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'theme', l.theme,
        'bible_verse', l.bible_verse,
        'preacher', l.preacher,
        'leader', l.leader,
        'notes', l.notes,
        'items', coalesce((
          select jsonb_agg(row_to_json(i)::jsonb order by i.sort_order)
          from (
            select
              li.id,
              li.item_type,
              li.item_kind,
              li.title,
              li.body,
              li.song_id,
              li.sort_order,
              li.responsible,
              li.duration
            from public.liturgy_items li
            where li.liturgy_id = l.id
          ) i
        ), '[]'::jsonb)
      )
      into v_liturgy
      from public.liturgies l
      where l.id = v_liturgy_id;
    end if;
  end if;

  if v_event.share_include_team then
    select s.id into v_schedule_id
    from public.schedules s
    where s.event_id = v_event.id
    limit 1;

    if v_schedule_id is not null then
      select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.sort_order), '[]'::jsonb)
      into v_team
      from (
        select
          sa.id,
          sa.role_label,
          coalesce(nullif(trim(sa.person_name), ''), p.display_name) as person_name,
          sa.sort_order,
          sa.availability_status
        from public.schedule_assignments sa
        left join public.profiles p on p.id = sa.user_id
        where sa.schedule_id = v_schedule_id
      ) t;
    end if;
  end if;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.service_date,
      'time', v_event.service_time,
      'theme', v_event.theme,
      'share_code', v_event.share_code,
      'share_include_songs', v_event.share_include_songs,
      'share_include_liturgy', v_event.share_include_liturgy,
      'share_include_team', v_event.share_include_team
    ),
    'songs', case when v_event.share_include_songs then v_songs else null end,
    'liturgy', case when v_event.share_include_liturgy then v_liturgy else null end,
    'team', case when v_event.share_include_team then v_team else null end
  );
end;
$$;

revoke all on function public.get_public_event(text) from public;
grant execute on function public.get_public_event(text) to anon, authenticated;

-- Compat: RPC antiga aponta para a nova
create or replace function public.get_public_event_repertoire(p_share_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.get_public_event(p_share_code);
$$;

revoke all on function public.get_public_event_repertoire(text) from public;
grant execute on function public.get_public_event_repertoire(text) to anon, authenticated;
