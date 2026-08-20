import type { Song } from '../types';

/** Rota pública da página de uma música (catálogo). */
export function songPath(songOrId: Pick<Song, 'id'> | string): string {
  const id = typeof songOrId === 'string' ? songOrId : songOrId.id;
  return `/musica/${id}`;
}

/** Rota da versão própria de uma música no repertório do evento (event_songs.id). */
export function songVersionPath(eventSongId: string): string {
  return `/musica/versao/${eventSongId}`;
}
