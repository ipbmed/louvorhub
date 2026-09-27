-- Unifica cadastro/edição de contas: lista com avatar/skills/nascimento;
-- admin atualiza skills/nascimento; admin pode gerenciar avatar de qualquer usuário.

drop function if exists public.list_registered_users(public.account_status);

create or replace function public.list_registered_users(
  p_status public.account_status default null
)
returns table (
  id uuid,
  email text,
  display_name text,
  phone text,
  account_status public.account_status,
  is_admin boolean,
  approved_at timestamptz,
  created_at timestamptz,
  avatar_path text,
  birth_date date,
  skills text[]
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Sem permissão para listar usuários';
  end if;

  return query
  select
    p.id,
    u.email::text,
    coalesce(p.display_name, split_part(u.email, '@', 1)) as display_name,
    p.phone,
    p.account_status,
    coalesce(p.is_admin, false) as is_admin,
    p.approved_at,
    coalesce(p.created_at, u.created_at) as created_at,
    p.avatar_path,
    p.birth_date,
    coalesce(p.skills, '{}'::text[]) as skills
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email not like '%@no-login.louvorhub.local'
    and (p_status is null or p.account_status = p_status)
  order by
    case p.account_status
      when 'pending' then 0
      when 'approved' then 1
      else 2
    end,
    coalesce(p.created_at, u.created_at) desc;
end;
$$;

revoke all on function public.list_registered_users(public.account_status) from public;
grant execute on function public.list_registered_users(public.account_status) to authenticated;

-- Atualiza assinatura com birth_date + skills
drop function if exists public.admin_update_user_account(
  uuid, text, text, text, boolean, public.account_status
);

create or replace function public.admin_update_user_account(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text default null,
  p_is_admin boolean default false,
  p_account_status public.account_status default null,
  p_birth_date date default null,
  p_skills text[] default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_existing uuid;
  v_status public.account_status;
  v_skills text[] := coalesce(p_skills, '{}'::text[]);
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_system_admin() then
    raise exception 'Somente administrador pode editar contas';
  end if;

  if p_user_id is null then
    raise exception 'Usuário inválido';
  end if;

  if v_name = '' or v_email = '' then
    raise exception 'Nome e e-mail são obrigatórios';
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Informe um e-mail válido';
  end if;

  if v_email like '%@no-login.louvorhub.local' then
    raise exception 'E-mail inválido';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  if p_user_id = v_caller and coalesce(p_is_admin, false) = false then
    raise exception 'Você não pode remover seu próprio acesso de administrador';
  end if;

  select u.id into v_existing
  from auth.users u
  where lower(u.email) = v_email
    and u.id <> p_user_id
  limit 1;

  if v_existing is not null then
    raise exception 'Já existe outra conta com este e-mail';
  end if;

  update auth.users
  set
    email = v_email,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('display_name', v_name),
    updated_at = now()
  where id = p_user_id;

  update auth.identities
  set
    identity_data = coalesce(identity_data, '{}'::jsonb)
      || jsonb_build_object('email', v_email, 'email_verified', true),
    updated_at = now()
  where user_id = p_user_id
    and provider = 'email';

  select account_status into v_status
  from public.profiles
  where id = p_user_id;

  if p_account_status is not null then
    v_status := p_account_status;
  end if;

  update public.profiles
  set
    display_name = v_name,
    phone = v_phone,
    is_admin = coalesce(p_is_admin, false),
    account_status = v_status,
    birth_date = p_birth_date,
    skills = v_skills,
    main_role = case when cardinality(v_skills) > 0 then v_skills[1] else null end,
    approved_at = case
      when v_status = 'approved' and approved_at is null then now()
      when v_status <> 'approved' then null
      else approved_at
    end,
    approved_by = case
      when v_status = 'approved' and approved_by is null then v_caller
      when v_status <> 'approved' then null
      else approved_by
    end
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_update_user_account(
  uuid, text, text, text, boolean, public.account_status, date, text[]
) from public;

grant execute on function public.admin_update_user_account(
  uuid, text, text, text, boolean, public.account_status, date, text[]
) to authenticated;

create or replace function public.admin_set_user_avatar(
  p_user_id uuid,
  p_avatar_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if not public.is_system_admin() then
    raise exception 'Somente administrador pode alterar foto de usuários';
  end if;
  if p_user_id is null then
    raise exception 'Usuário inválido';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  update public.profiles
  set avatar_path = nullif(trim(coalesce(p_avatar_path, '')), '')
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_user_avatar(uuid, text) from public;
grant execute on function public.admin_set_user_avatar(uuid, text) to authenticated;

-- Storage: admin pode gravar/apagar avatar de qualquer usuário
drop policy if exists "avatars_admin_write" on storage.objects;
create policy "avatars_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_system_admin());

drop policy if exists "avatars_admin_update" on storage.objects;
create policy "avatars_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.is_system_admin());

drop policy if exists "avatars_admin_delete" on storage.objects;
create policy "avatars_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.is_system_admin());
