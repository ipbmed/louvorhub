-- Metadados do integrante no grupo (ex.: liderança)
alter table public.group_members
  add column if not exists is_leader boolean not null default false;
