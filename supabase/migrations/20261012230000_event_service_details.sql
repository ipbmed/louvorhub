-- Pregador, dirigente, tema e texto bíblico pertencem ao evento (culto), não à liturgia.
-- Copia os dados das liturgias para os eventos e remove as colunas duplicadas.

alter table public.events
  add column if not exists bible_verse text,
  add column if not exists preacher text,
  add column if not exists leader text;

-- Liturgias antigas sem evento: cria o evento a partir da própria liturgia.
do $$
declare
  r record;
  v_event_id uuid;
begin
  for r in
    select * from public.liturgies where event_id is null order by created_at
  loop
    insert into public.events (org_id, title, service_date, created_by, created_at)
    values (
      r.org_id,
      coalesce(nullif(trim(r.title), ''), 'Culto'),
      coalesce(r.service_date, r.created_at::date),
      r.created_by,
      r.created_at
    )
    returning id into v_event_id;

    update public.liturgies set event_id = v_event_id where id = r.id;
  end loop;
end $$;

update public.events e
set
  theme = coalesce(nullif(trim(e.theme), ''), nullif(trim(l.theme), '')),
  bible_verse = coalesce(nullif(trim(e.bible_verse), ''), nullif(trim(l.bible_verse), '')),
  preacher = coalesce(nullif(trim(e.preacher), ''), nullif(trim(l.preacher), '')),
  leader = coalesce(nullif(trim(e.leader), ''), nullif(trim(l.leader), ''))
from public.liturgies l
where l.event_id = e.id;

alter table public.liturgies
  drop column if exists theme,
  drop column if exists bible_verse,
  drop column if exists preacher,
  drop column if exists leader;

-- Link público: os dados do culto vêm do evento.
create or replace function public.get_public_event(p_share_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_code text;
  v_songs jsonb := '[]'::jsonb;
  v_liturgy jsonb := null;
  v_team jsonb := '[]'::jsonb;
  v_liturgy_id uuid;
  v_schedule_id uuid;
begin
  v_code := lower(trim(coalesce(p_share_code, '')));
  if length(v_code) < 3 then
    return null;
  end if;

  select * into v_event
  from public.events e
  where lower(e.share_code) = v_code
    and e.share_enabled = true
    and (e.share_expires_at is null or e.share_expires_at > now())
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
      'bible_verse', v_event.bible_verse,
      'preacher', v_event.preacher,
      'leader', v_event.leader,
      'share_code', v_event.share_code,
      'share_expires_at', v_event.share_expires_at,
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

notify pgrst, 'reload schema';
