-- Cadastro com aprovação: pending → approved → magic link

do $$ begin
  create type public.account_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists account_status public.account_status not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles (id) on delete set null;

-- Usuários já existentes (com e-mail real) ficam aprovados
update public.profiles p
set
  account_status = 'approved',
  approved_at = coalesce(p.updated_at, p.created_at, now())
where p.account_status = 'pending'
  and exists (
    select 1
    from auth.users u
    where u.id = p.id
      and u.email is not null
      and u.email not like '%@no-login.louvorhub.local'
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, account_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when coalesce(new.raw_user_meta_data->>'account_status', '') = 'approved' then 'approved'::public.account_status
      else 'pending'::public.account_status
    end
  );
  return new;
end;
$$;

create or replace function public.is_approved_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'approved'
  );
$$;

create or replace function public.approve_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Sem permissão para aprovar usuários';
  end if;

  update public.profiles
  set
    account_status = 'approved',
    approved_at = now(),
    approved_by = auth.uid()
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

create or replace function public.reject_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Sem permissão para rejeitar usuários';
  end if;

  update public.profiles
  set
    account_status = 'rejected',
    approved_at = null,
    approved_by = auth.uid()
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

create or replace function public.lookup_registered_user(p_email text)
returns table (
  id uuid,
  email text,
  display_name text,
  account_status public.account_status
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' then
    raise exception 'Informe o e-mail';
  end if;

  if not (
    public.is_system_admin()
    or exists (
      select 1
      from public.resource_grants g
      where g.user_id = auth.uid()
        and g.role = 'church_editor'
    )
  ) then
    raise exception 'Sem permissão para consultar usuários';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(p.display_name, split_part(u.email, '@', 1)) as display_name,
    p.account_status
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = v_email
    and u.email not like '%@no-login.louvorhub.local'
  limit 1;
end;
$$;

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
  created_at timestamptz
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
    coalesce(p.created_at, u.created_at) as created_at
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

create or replace function public.admin_create_user(
  p_name text,
  p_email text,
  p_phone text default null,
  p_birth_date date default null,
  p_skills text[] default '{}',
  p_church_id uuid default null,
  p_is_admin boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_user_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_skills text[] := coalesce(p_skills, '{}');
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_system_admin() then
    raise exception 'Somente administrador pode cadastrar usuários manualmente';
  end if;

  if coalesce(trim(p_name), '') = '' or v_email = '' then
    raise exception 'Nome e e-mail são obrigatórios';
  end if;

  if p_is_admin and not public.is_system_admin() then
    raise exception 'Somente administrador pode promover admins';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      is_sso_user,
      is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', trim(p_name), 'account_status', 'approved'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  update public.profiles
  set
    display_name = trim(p_name),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    birth_date = p_birth_date,
    skills = v_skills,
    main_role = case when cardinality(v_skills) > 0 then v_skills[1] else null end,
    church_id = p_church_id,
    is_admin = coalesce(p_is_admin, false),
    account_status = 'approved',
    approved_at = now(),
    approved_by = v_caller
  where id = v_user_id;

  return v_user_id;
end;
$$;

create or replace function public.create_org_member(
  p_org_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_birth_date date default null,
  p_skills text[] default '{}',
  p_church_id uuid default null,
  p_status text default 'active',
  p_is_admin boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_user_id uuid;
  v_email text;
  v_status text;
  v_skills text[] := coalesce(p_skills, '{}');
  v_account_status public.account_status;
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  if p_org_id is null or coalesce(trim(p_name), '') = '' then
    raise exception 'Nome e organização são obrigatórios';
  end if;

  if not (
    public.is_system_admin()
    or public.has_church_editor(p_org_id)
  ) then
    raise exception 'Sem permissão para cadastrar usuários';
  end if;

  if p_is_admin and not public.is_system_admin() then
    raise exception 'Somente administrador pode promover admins';
  end if;

  v_status := case when p_status = 'inactive' then 'inactive' else 'active' end;
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if v_email is null then
    raise exception 'Informe o e-mail de um usuário já cadastrado no sistema';
  end if;

  select u.id, p.account_status
  into v_user_id, v_account_status
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = v_email
    and u.email not like '%@no-login.louvorhub.local'
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário não cadastrado. Peça para a pessoa criar conta e aguardar aprovação.';
  end if;

  if v_account_status <> 'approved' then
    raise exception 'Este usuário ainda não foi aprovado pelo administrador.';
  end if;

  update public.profiles
  set
    display_name = trim(p_name),
    phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), phone),
    birth_date = coalesce(p_birth_date, birth_date),
    skills = case when cardinality(v_skills) > 0 then v_skills else skills end,
    main_role = case
      when cardinality(v_skills) > 0 then v_skills[1]
      else main_role
    end,
    church_id = coalesce(p_church_id, church_id),
    is_admin = case
      when public.is_system_admin() then coalesce(p_is_admin, false)
      else is_admin
    end
  where id = v_user_id;

  insert into public.memberships (org_id, user_id, role, status)
  values (p_org_id, v_user_id, 'member', v_status)
  on conflict (org_id, user_id) do update
    set status = excluded.status;

  return v_user_id;
end;
$$;

grant execute on function public.approve_user_account(uuid) to authenticated;
grant execute on function public.reject_user_account(uuid) to authenticated;
grant execute on function public.lookup_registered_user(text) to authenticated;
grant execute on function public.list_registered_users(public.account_status) to authenticated;
grant execute on function public.admin_create_user(text, text, text, date, text[], uuid, boolean) to authenticated;
