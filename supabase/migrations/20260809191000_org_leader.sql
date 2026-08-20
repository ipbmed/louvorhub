-- Igreja: pastor → leader
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'pastor'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'leader'
  ) then
    alter table public.organizations rename column pastor to leader;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'leader'
  ) then
    alter table public.organizations add column leader text;
  end if;
end $$;
