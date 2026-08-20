-- Playlists do usuário: sem vínculo com igreja (org) nem grupo

update public.playlists
set org_id = null, group_id = null
where kind = 'individual' or kind is null;

create index if not exists playlists_created_by_idx on public.playlists (created_by);

create or replace function public.can_view_playlist(p_playlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playlists p
    where p.id = p_playlist_id
      and (
        public.is_system_admin()
        or p.visibility = 'public_link'
        or p.created_by = auth.uid()
        or exists (
          select 1 from public.playlist_shares s
          where s.playlist_id = p.id and s.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_edit_playlist(p_playlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playlists p
    where p.id = p_playlist_id
      and (
        public.is_system_admin()
        or p.created_by = auth.uid()
        or exists (
          select 1 from public.playlist_shares s
          where s.playlist_id = p.id
            and s.user_id = auth.uid()
            and s.permission = 'edit'
        )
      )
  );
$$;

drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert to authenticated
  with check (
    public.is_system_admin()
    or (
      created_by = auth.uid()
      and org_id is null
      and group_id is null
    )
  );
