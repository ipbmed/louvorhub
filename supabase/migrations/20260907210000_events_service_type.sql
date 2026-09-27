-- Garante service_type em events (create table if not exists não adiciona colunas
-- quando a tabela já existia sem esse campo).
alter table public.events
  add column if not exists service_type text;

update public.events
set service_type = coalesce(nullif(trim(service_type), ''), nullif(trim(title), ''), 'Culto')
where service_type is null or trim(service_type) = '';

notify pgrst, 'reload schema';
