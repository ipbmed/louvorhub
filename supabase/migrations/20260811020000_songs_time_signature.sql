-- Compassos (time signature) no catálogo e nas versões de repertório

alter table public.songs
  add column if not exists time_signature text;

alter table public.song_versions
  add column if not exists time_signature text;
