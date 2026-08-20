-- Arquivamento de repertórios de grupo + limite de 5 individuais por usuário

alter table public.playlists
  add column if not exists archived_at timestamptz;

create index if not exists playlists_archived_at_idx
  on public.playlists (archived_at)
  where archived_at is not null;

create or replace function public.enforce_individual_playlist_limit()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  if new.kind is distinct from 'individual' then
    return new;
  end if;
  if coalesce(new.is_permanent, false) is not true then
    return new;
  end if;
  if new.created_by is null then
    return new;
  end if;

  -- Em UPDATE, só valida se mudou algo relevante para o limite
  if tg_op = 'UPDATE'
     and old.kind = 'individual'
     and old.is_permanent is true
     and old.created_by is not distinct from new.created_by then
    return new;
  end if;

  select count(*)::int into v_count
  from public.playlists p
  where p.created_by = new.created_by
    and p.kind = 'individual'
    and p.is_permanent is true
    and (tg_op = 'INSERT' or p.id is distinct from new.id);

  if v_count >= 5 then
    raise exception 'Limite de 5 repertórios individuais por usuário.';
  end if;

  return new;
end;
$$;

drop trigger if exists playlists_individual_limit on public.playlists;
create trigger playlists_individual_limit
  before insert or update on public.playlists
  for each row execute function public.enforce_individual_playlist_limit();
