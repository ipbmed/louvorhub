-- Status ativo/inativo do membro na organização
alter table public.memberships
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive'));

create index if not exists memberships_status_idx on public.memberships (org_id, status);
