-- Playlists pessoais não usam mais data; a coluna purpose armazenava essa informação.
alter table public.playlists drop column if exists purpose;
