-- Admin pode editar dados de contas cadastradas

create or replace function public.admin_update_user_account(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_phone text default null,
  p_is_admin boolean default false,
  p_account_status public.account_status default null
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

  -- Impede o admin de remover o próprio acesso de administrador
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
  uuid, text, text, text, boolean, public.account_status
) from public;

grant execute on function public.admin_update_user_account(
  uuid, text, text, text, boolean, public.account_status
) to authenticated;
