-- A escala passa a herdar título, data, horário, tipo de culto e tema do evento.
-- Remove as cópias desses campos (ficavam desatualizadas ao editar o evento)
-- e o status, sem uso: o estado real da escala é is_finalized.

-- Escalas antigas sem evento: cria o evento a partir dos dados da própria escala.
do $$
declare
  r record;
  v_event_id uuid;
begin
  for r in
    select * from public.schedules where event_id is null order by created_at
  loop
    insert into public.events (
      org_id, title, service_date, service_time, service_type, theme, group_id, created_by, created_at
    ) values (
      r.org_id,
      coalesce(nullif(trim(r.title), ''), nullif(trim(r.service_type), ''), 'Culto'),
      r.service_date,
      r.service_time,
      r.service_type,
      r.theme,
      r.group_id,
      r.created_by,
      r.created_at
    )
    returning id into v_event_id;

    update public.schedules set event_id = v_event_id where id = r.id;
  end loop;
end $$;

alter table public.schedules alter column event_id set not null;

alter table public.schedules
  drop column if exists title,
  drop column if exists service_date,
  drop column if exists service_time,
  drop column if exists service_type,
  drop column if exists theme,
  drop column if exists status;

drop type if exists public.schedule_status;

notify pgrst, 'reload schema';
