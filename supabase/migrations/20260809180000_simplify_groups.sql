-- Simplifica groups / group_members:
-- grupo = nome + descrição; integrante = usuário vinculado + is_leader.
-- Remove campos legados (papel, telefone, skills, etc.).

-- groups: liderança vem de group_members.is_leader
alter table public.groups
  drop column if exists leader_name;

-- Remove integrantes sem usuário (não são mais suportados)
delete from public.group_members
where user_id is null;

alter table public.group_members
  drop constraint if exists group_members_person_check;

alter table public.group_members
  drop column if exists role_label,
  drop column if exists person_name,
  drop column if exists phone,
  drop column if exists email,
  drop column if exists status,
  drop column if exists musician_skills,
  drop column if exists technician_skills;

alter table public.group_members
  add column if not exists is_leader boolean not null default false;

alter table public.group_members
  alter column user_id set not null;
