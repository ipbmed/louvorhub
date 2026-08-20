-- Lista pública: igrejas com eventos compartilhados + eventos filtrados por igreja

create or replace function public.list_public_shared_orgs()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'sigla', o.sigla,
        'city', o.city
      )
      order by o.name asc
    ),
    '[]'::jsonb
  )
  from public.organizations o
  where coalesce(o.is_global, false) = false
    and exists (
      select 1
      from public.events e
      where e.org_id = o.id
        and e.share_enabled = true
        and (e.share_expires_at is null or e.share_expires_at > now())
        and e.service_date >= (current_date - 1)
    );
$$;

revoke all on function public.list_public_shared_orgs() from public;
grant execute on function public.list_public_shared_orgs() to anon, authenticated;

drop function if exists public.list_public_shared_events();

create or replace function public.list_public_shared_events(p_org_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', e.title,
        'date', e.service_date,
        'time', e.service_time,
        'theme', e.theme,
        'share_code', e.share_code,
        'share_expires_at', e.share_expires_at,
        'org_id', e.org_id
      )
      order by e.service_date asc, coalesce(e.service_time, '00:00') asc
    ),
    '[]'::jsonb
  )
  from public.events e
  where e.org_id = p_org_id
    and e.share_enabled = true
    and (e.share_expires_at is null or e.share_expires_at > now())
    and e.service_date >= (current_date - 1);
$$;

revoke all on function public.list_public_shared_events(uuid) from public;
grant execute on function public.list_public_shared_events(uuid) to anon, authenticated;
