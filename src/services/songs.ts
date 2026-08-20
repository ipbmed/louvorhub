import { dbSongToSong, mediaLinksToDb } from '@/adapters/songAdapter';
import type { DbHymnal, DbSong } from '@/lib/dbTypes';
import { requireSupabase } from '@/lib/supabase';
import type { Song } from '@/types';

const SONG_SELECT = `
  *,
  hymnals(*),
  song_links(*)
`;

/** Lista músicas do catálogo (global). */
export async function listSongs(_orgId?: string, _includeGlobal = true): Promise<Song[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('songs')
    .select(SONG_SELECT)
    .order('number', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data || []) as unknown as DbSong[]).map(dbSongToSong);
}

export async function getSong(id: string): Promise<Song | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('songs')
    .select(SONG_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? dbSongToSong(data as unknown as DbSong) : null;
}

export async function listHymnals(): Promise<{ id: string; name: string }[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('hymnals').select('id, name').order('name');
  if (error) throw error;
  return ((data || []) as DbHymnal[]).map((h) => ({ id: h.id, name: h.name }));
}

async function resolveHymnalId(hymnalId?: string | null, hymnalName?: string): Promise<string | null> {
  if (hymnalId) return hymnalId;
  const name = (hymnalName || '').trim();
  if (!name) return null;
  const sb = requireSupabase();
  const { data: existing } = await sb.from('hymnals').select('id').eq('name', name).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await sb.from('hymnals').insert({ name }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function upsertSong(_orgId: string, song: Song): Promise<Song> {
  const sb = requireSupabase();
  const kind = song.songType || (song.number != null ? 'hino' : 'cantico');
  const hymnalId =
    kind === 'hino'
      ? await resolveHymnalId(song.hymnalId, song.hymnal || 'Novo Cântico')
      : null;

  const payload = {
    title: song.title,
    subtitle: song.subtitle?.trim() ? song.subtitle.trim() : null,
    kind,
    hymnal_id: hymnalId,
    number: kind === 'hino' ? song.number ?? null : null,
    tags: song.tags || [],
    lyrics_md: song.lyrics ?? '',
    musical_key: song.originalKey?.trim() ? song.originalKey.trim() : null,
    bpm: song.bpm != null && !Number.isNaN(Number(song.bpm)) ? Number(song.bpm) : null,
    time_signature: song.timeSignature?.trim() ? song.timeSignature.trim() : null,
    author: song.author?.trim() ? song.author.trim() : null,
    composition: (song.composition || song.composer)?.trim()
      ? (song.composition || song.composer)!.trim()
      : null,
    instructions: song.instructions?.trim() ? song.instructions.trim() : null,
    reviewed: Boolean(song.reviewed),
    updated_at: new Date().toISOString(),
  };

  let songId = song.id;
  const isExisting =
    Boolean(songId) &&
    !songId.startsWith('temp-') &&
    !songId.startsWith('hino-') &&
    !songId.startsWith('cantico-');

  if (isExisting) {
    const { error } = await sb.from('songs').update(payload).eq('id', songId);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from('songs').insert(payload).select('id').single();
    if (error) throw error;
    songId = data.id;
  }

  const linksExplicit = Array.isArray(song.mediaLinks);
  let nextLinks = mediaLinksToDb(
    (song.mediaLinks || []).filter((l) => Boolean(l.url?.trim())),
  );

  // Compat: campos legados só quando o caller não enviou mediaLinks
  if (!linksExplicit && nextLinks.length === 0) {
    const legacy: { label: string; url: string; sort_order: number }[] = [];
    if (song.youtubeUrl?.trim()) {
      legacy.push({ label: 'YouTube', url: song.youtubeUrl.trim(), sort_order: 0 });
    }
    if (song.spotifyUrl?.trim()) {
      legacy.push({ label: 'Spotify', url: song.spotifyUrl.trim(), sort_order: 1 });
    }
    if (song.otherMediaUrl?.trim()) {
      legacy.push({ label: 'Mídia', url: song.otherMediaUrl.trim(), sort_order: 2 });
    }
    nextLinks = legacy;
  }

  // Substitui links: delete com RETURNING para não engolir falha de RLS
  const { error: deleteLinksError } = await sb
    .from('song_links')
    .delete()
    .eq('song_id', songId)
    .select('id');
  if (deleteLinksError) throw deleteLinksError;

  if (nextLinks.length) {
    const { error: insertLinksError } = await sb
      .from('song_links')
      .insert(nextLinks.map((l) => ({ ...l, song_id: songId })));
    if (insertLinksError) throw insertLinksError;
  } else {
    // Confirma limpeza (RLS pode retornar sucesso apagando 0 linhas)
    const { count, error: countError } = await sb
      .from('song_links')
      .select('id', { count: 'exact', head: true })
      .eq('song_id', songId);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new Error(
        'Não foi possível remover os links de mídia. Verifique se você tem permissão de administrador.',
      );
    }
  }

  const saved = await getSong(songId);
  if (!saved) throw new Error('Falha ao salvar música');

  if (linksExplicit && nextLinks.length === 0) {
    return {
      ...saved,
      mediaLinks: [],
      youtubeUrl: undefined,
      spotifyUrl: undefined,
      otherMediaUrl: undefined,
    };
  }

  return saved;
}

export async function deleteSong(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('songs').delete().eq('id', id);
  if (error) throw error;
}

export async function importSongsBulk(orgId: string, songs: Song[]): Promise<void> {
  for (const song of songs) {
    await upsertSong(orgId, { ...song, id: '' });
  }
}
