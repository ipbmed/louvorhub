-- Full name stays in `name`; add short acronym (sigla)
alter table public.organizations
  add column if not exists sigla text;

comment on column public.organizations.name is 'Nome completo da igreja';
comment on column public.organizations.sigla is 'Sigla / nome curto (ex.: IPB Med)';

-- Allow logo replace after create
create policy "org_logos_member_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );

create policy "org_logos_member_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );

-- Seed global library sigla
update public.organizations
set sigla = 'NC'
where slug = 'novo-cantico' and (sigla is null or sigla = '');
