-- Admin pode excluir contas cadastradas (auth.users + perfil)

create or replace function public.admin_delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  if not public.is_system_admin() then
    raise exception 'Somente administrador pode excluir contas';
  end if;

  if p_user_id is null then
    raise exception 'Usuário inválido';
  end if;

  if p_user_id = v_caller then
    raise exception 'Você não pode excluir a própria conta';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Usuário não encontrado';
  end if;

  -- Remove vínculos locais antes do auth.users
  delete from public.resource_grants where user_id = p_user_id;
  delete from public.memberships where user_id = p_user_id;
  delete from public.group_members where user_id = p_user_id;
  delete from public.user_favorites where user_id = p_user_id;

  delete from auth.identities where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user_account(uuid) from public;
grant execute on function public.admin_delete_user_account(uuid) to authenticated;
