-- Flag de revisão da cifra/letra do catálogo
alter table public.songs
  add column if not exists reviewed boolean not null default false;

comment on column public.songs.reviewed is
  'Quando false, avisa o usuário no modo cifra para conferir a cifra.';
