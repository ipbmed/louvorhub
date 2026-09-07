-- Convites por e-mail para associar (e cadastrar, se preciso) membros à igreja

do $$ begin
  create type public.org_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  display_name text,
  token text not null unique,
  status public.org_invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  constraint org_invitations_email_lower check (email = lower(email))
);

create unique index if not exists org_invitations_pending_email_org_uidx
  on public.org_invitations (org_id, email)
  where status = 'pending';

create index if not exists org_invitations_org_id_idx on public.org_invitations (org_id);
create index if not exists org_invitations_token_idx on public.org_invitations (token);

alter table public.org_invitations enable row level security;

drop policy if exists "org_invitations_select" on public.org_invitations;
create policy "org_invitations_select" on public.org_invitations
  for select using (
    public.is_system_admin()
    or public.has_church_editor(org_id)
  );

-- Criar convite (editor da igreja ou admin)
create or replace function public.create_org_invitation(
  p_org_id uuid,
  p_email text,
  p_display_name text default null
)
returns public.org_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_row public.org_invitations;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not (public.is_system_admin() or public.has_church_editor(p_org_id)) then
    raise exception 'Sem permissão para convidar membros nesta igreja';
  end if;

  if v_email = '' or position('@' in v_email) = 0 or position('.' in split_part(v_email, '@', 2)) = 0 then
    raise exception 'Informe um e-mail válido';
  end if;

  if exists (
    select 1
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.org_id = p_org_id
      and lower(u.email) = v_email
  ) then
    raise exception 'Este e-mail já é membro desta igreja';
  end if;

  -- Reutiliza convite pendente ou cria novo
  update public.org_invitations
  set
    display_name = coalesce(v_name, display_name),
    invited_by = auth.uid(),
    expires_at = now() + interval '14 days',
    token = encode(extensions.gen_random_bytes(16), 'hex')
  where org_id = p_org_id
    and email = v_email
    and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    insert into public.org_invitations (org_id, email, display_name, token, invited_by)
    values (
      p_org_id,
      v_email,
      v_name,
      encode(extensions.gen_random_bytes(16), 'hex'),
      auth.uid()
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.create_org_invitation(uuid, text, text) from public;
grant execute on function public.create_org_invitation(uuid, text, text) to authenticated;

create or replace function public.list_org_invitations(p_org_id uuid)
returns setof public.org_invitations
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if not (public.is_system_admin() or public.has_church_editor(p_org_id)) then
    raise exception 'Sem permissão';
  end if;

  -- Expira pendentes vencidos
  update public.org_invitations
  set status = 'expired'
  where org_id = p_org_id
    and status = 'pending'
    and expires_at < now();

  return query
  select *
  from public.org_invitations
  where org_id = p_org_id
  order by created_at desc;
end;
$$;

revoke all on function public.list_org_invitations(uuid) from public;
grant execute on function public.list_org_invitations(uuid) to authenticated;

create or replace function public.revoke_org_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select org_id into v_org from public.org_invitations where id = p_invitation_id;
  if v_org is null then
    raise exception 'Convite não encontrado';
  end if;

  if not (public.is_system_admin() or public.has_church_editor(v_org)) then
    raise exception 'Sem permissão';
  end if;

  update public.org_invitations
  set status = 'revoked'
  where id = p_invitation_id
    and status = 'pending';
end;
$$;

revoke all on function public.revoke_org_invitation(uuid) from public;
grant execute on function public.revoke_org_invitation(uuid) to authenticated;

-- Leitura pública limitada do convite (para a página /convite/:token)
create or replace function public.get_org_invitation_public(p_token text)
returns table (
  org_id uuid,
  org_name text,
  email text,
  display_name text,
  status public.org_invitation_status,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := lower(trim(coalesce(p_token, '')));
begin
  if v_token = '' then
    raise exception 'Token inválido';
  end if;

  update public.org_invitations i
  set status = 'expired'
  where i.token = v_token
    and i.status = 'pending'
    and i.expires_at < now();

  return query
  select
    i.org_id,
    o.name,
    i.email,
    i.display_name,
    i.status,
    i.expires_at
  from public.org_invitations i
  join public.organizations o on o.id = i.org_id
  where i.token = v_token
  limit 1;
end;
$$;

revoke all on function public.get_org_invitation_public(text) from public;
grant execute on function public.get_org_invitation_public(text) to anon, authenticated;

-- Aceitar convite (usuário autenticado com o mesmo e-mail)
create or replace function public.accept_org_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.org_invitations;
begin
  if v_uid is null then
    raise exception 'Faça login para aceitar o convite';
  end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_uid;

  select * into v_inv
  from public.org_invitations
  where token = lower(trim(p_token))
  for update;

  if v_inv.id is null then
    raise exception 'Convite não encontrado';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at < now() then
    update public.org_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'Este convite expirou';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'Este convite foi cancelado';
  end if;

  if v_inv.status = 'accepted' then
    return v_inv.org_id;
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Convite indisponível';
  end if;

  if v_email is distinct from v_inv.email then
    raise exception 'Entre com o e-mail % para aceitar este convite', v_inv.email;
  end if;

  update public.profiles
  set
    account_status = 'approved',
    approved_at = coalesce(approved_at, now()),
    display_name = coalesce(nullif(trim(display_name), ''), v_inv.display_name, display_name),
    church_id = coalesce(church_id, v_inv.org_id)
  where id = v_uid;

  insert into public.memberships (org_id, user_id, role, status)
  values (v_inv.org_id, v_uid, 'member', 'active')
  on conflict (org_id, user_id) do update
    set status = 'active';

  update public.org_invitations
  set
    status = 'accepted',
    accepted_at = now(),
    accepted_user_id = v_uid
  where id = v_inv.id;

  return v_inv.org_id;
end;
$$;

revoke all on function public.accept_org_invitation(text) from public;
grant execute on function public.accept_org_invitation(text) to authenticated;
