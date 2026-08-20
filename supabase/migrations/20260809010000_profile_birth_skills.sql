-- Campos extras do perfil do usuário
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists skills text[] not null default '{}';
