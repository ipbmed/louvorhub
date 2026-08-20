-- Igreja de afiliação do perfil (membro da igreja) — opcional
alter table public.profiles
  add column if not exists church_id uuid references public.organizations (id) on delete set null;

create index if not exists profiles_church_id_idx on public.profiles (church_id);

-- Admins/líderes da mesma org podem atualizar perfil de membros (UserManager)
create policy "profiles_update_org_managers" on public.profiles for update using (
  exists (
    select 1
    from public.memberships m_target
    join public.memberships m_admin
      on m_admin.org_id = m_target.org_id
    where m_target.user_id = profiles.id
      and m_admin.user_id = auth.uid()
      and m_admin.role in ('owner', 'admin', 'leader')
  )
);
