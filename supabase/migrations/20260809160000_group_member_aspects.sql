-- Aspectos do integrante no grupo: músico e/ou técnico
alter table public.group_members
  add column if not exists musician_skills text[] not null default '{}',
  add column if not exists technician_skills text[] not null default '{}';
