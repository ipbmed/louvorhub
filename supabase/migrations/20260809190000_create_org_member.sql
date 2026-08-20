-- Cria usuário (auth.users + profile + membership) a partir do app.
-- Necessário porque profiles.id referencia auth.users e o client não pode usar service role.

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

  if v_email is not null then
    select u.id into v_user_id
    from auth.users u
    where lower(u.email) = v_email
    limit 1;
  end if;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    if v_email is null then
      v_email := 'member-' || replace(v_user_id::text, '-', '') || '@no-login.louvorhub.local';
    end if;

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
      jsonb_build_object('display_name', trim(p_name)),
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

revoke all on function public.create_org_member(
  uuid, text, text, text, date, text[], uuid, text, boolean
) from public;

grant execute on function public.create_org_member(
  uuid, text, text, text, date, text[], uuid, text, boolean
) to authenticated;
