-- Cadastro público via RPC (evita Edge Function + CORS)

create or replace function public.register_user_account(p_name text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
  v_status public.account_status;
begin
  if v_name = '' or v_email = '' then
    raise exception 'Nome e e-mail são obrigatórios.';
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Informe um e-mail válido.';
  end if;

  if v_email like '%@no-login.louvorhub.local' then
    raise exception 'E-mail inválido.';
  end if;

  select u.id, p.account_status
  into v_user_id, v_status
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = v_email
  limit 1;

  if v_user_id is not null then
    if v_status = 'approved' then
      return jsonb_build_object(
        'ok', true,
        'message', 'Este e-mail já possui cadastro aprovado. Use Entrar para receber o magic link.'
      );
    end if;

    if v_status = 'rejected' then
      raise exception 'Cadastro não aprovado. Entre em contato com o administrador do LouvorHub.';
    end if;

    return jsonb_build_object(
      'ok', true,
      'message', 'Cadastro já enviado e aguardando aprovação do administrador.'
    );
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_user_id is not null then
    update public.profiles
    set display_name = v_name, account_status = 'pending'
    where id = v_user_id;

    return jsonb_build_object(
      'ok', true,
      'message', 'Cadastro recebido! Aguarde a aprovação do administrador para entrar com magic link.'
    );
  end if;

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
    jsonb_build_object('display_name', v_name),
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

  update public.profiles
  set
    display_name = v_name,
    account_status = 'pending'
  where id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Cadastro recebido! Aguarde a aprovação do administrador para entrar com magic link.'
  );
end;
$$;

revoke all on function public.register_user_account(text, text) from public;
grant execute on function public.register_user_account(text, text) to anon, authenticated;
