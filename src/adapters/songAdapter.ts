import type { DbEventSong, DbSong, DbSongLink } from '@/lib/dbTypes';
import type { EventSong, MediaLink, MediaLinkType, Song } from '@/types';

function detectLinkType(url: string, label: string): MediaLinkType {
  const u = url.toLowerCase();
  const l = label.toLowerCase();
  if (u.includes('music.youtube') || l.includes('yt music') || l.includes('ytmusic')) return 'ytmusic';
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('spotify')) return 'spotify';
  return 'other';
}

export function dbSongToSong(row: DbSong): Song {
  const links = [...(row.song_links || [])].sort((a, b) => a.sort_order - b.sort_order);
  const mediaLinks: MediaLink[] = links.map((link) => ({
    id: link.id,
    type: detectLinkType(link.url, link.label),
    title: link.label,
    url: link.url,
  }));

  const youtubeUrl = mediaLinks.find((m) => m.type === 'youtube')?.url;
  const spotifyUrl = mediaLinks.find((m) => m.type === 'spotify')?.url;
  const otherMediaUrl = mediaLinks.find((m) => m.type === 'other' || m.type === 'ytmusic')?.url;
  const composition = row.composition ?? undefined;

  return {
    id: row.id,
    songType: row.kind,
    hymnalId: row.hymnal_id,
    hymnal: row.hymnals?.name ?? undefined,
    number: row.number,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    lyrics: row.lyrics_md || '',
    category: '',
    tags: row.tags || [],
    author: row.author ?? undefined,
    composer: composition,
    composition,
    originalKey: row.musical_key ?? undefined,
    bpm: row.bpm ?? null,
    timeSignature: row.time_signature ?? undefined,
    instructions: row.instructions ?? undefined,
    reviewed: Boolean(row.reviewed),
    youtubeUrl,
    spotifyUrl,
    otherMediaUrl,
    mediaLinks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function dbEventSongToUi(row: DbEventSong): EventSong {
  const versionRaw = row.event_songs_version;
  const version = Array.isArray(versionRaw) ? versionRaw[0] : versionRaw;
  return {
    id: row.id,
    songId: row.song_id,
    eventId: row.event_id,
    repertoireId: row.event_id,
    sortOrder: row.sort_order,
    hasVersion: Boolean(version),
    lyrics: version?.lyrics_md || undefined,
    originalKey: version?.musical_key ?? undefined,
    bpm: version?.bpm ?? null,
    timeSignature: version?.time_signature ?? undefined,
    instructions: version?.instructions ?? undefined,
  };
}

/** @deprecated use dbEventSongToUi */
export const dbSongVersionToUi = dbEventSongToUi;

export function mediaLinksToDb(links: MediaLink[] | undefined): Omit<DbSongLink, 'id' | 'song_id'>[] {
  return (links || [])
    .filter((link) => Boolean(link.url?.trim()))
    .map((link, index) => ({
      label: link.title || link.type,
      url: link.url.trim(),
      sort_order: index,
    }));
}
