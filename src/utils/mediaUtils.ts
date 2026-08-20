import { MediaLink, MediaLinkType, Song } from '../types';

/**
 * Detects media link type from a URL
 */
export function detectMediaType(url: string): MediaLinkType {
  if (!url) return 'other';
  const cleanUrl = url.trim().toLowerCase();
  
  if (cleanUrl.includes('music.youtube.com')) {
    return 'ytmusic';
  }
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (cleanUrl.includes('spotify.com')) {
    return 'spotify';
  }
  return 'other';
}

/**
 * Extracts YouTube or YouTube Music video ID
 */
export function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Generates an iframe embed URL for Spotify track/album/playlist
 */
export function getSpotifyEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  }
  return null;
}

/**
 * Checks if a URL points directly to an audio file
 */
export function isDirectAudioUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.ogg') ||
    lower.includes('audio/') ||
    lower.includes('uc?export=download')
  );
}

/**
 * Combines explicit mediaLinks with legacy fields (youtubeUrl, spotifyUrl, otherMediaUrl)
 */
export function getCombinedMediaLinks(Song: Partial<Song>): MediaLink[] {
  const result: MediaLink[] = [];
  const addedUrls = new Set<string>();

  // First, add existing mediaLinks if present
  if (Array.isArray(Song.mediaLinks)) {
    Song.mediaLinks.forEach((item, index) => {
      if (item && item.url && item.url.trim()) {
        const trimmedUrl = item.url.trim();
        addedUrls.add(trimmedUrl);
        result.push({
          id: item.id || `ml-${index}-${Date.now()}`,
          type: item.type || detectMediaType(trimmedUrl),
          title: item.title,
          url: trimmedUrl,
        });
      }
    });
  }

  // Next, incorporate legacy youtubeUrl if not already present
  if (Song.youtubeUrl && Song.youtubeUrl.trim() && !addedUrls.has(Song.youtubeUrl.trim())) {
    const url = Song.youtubeUrl.trim();
    addedUrls.add(url);
    result.push({
      id: `legacy-yt-${Date.now()}`,
      type: detectMediaType(url),
      title: 'YouTube',
      url: url,
    });
  }

  // Next, incorporate legacy spotifyUrl if not already present
  if (Song.spotifyUrl && Song.spotifyUrl.trim() && !addedUrls.has(Song.spotifyUrl.trim())) {
    const url = Song.spotifyUrl.trim();
    addedUrls.add(url);
    result.push({
      id: `legacy-spot-${Date.now()}`,
      type: 'spotify',
      title: 'Spotify',
      url: url,
    });
  }

  // Next, incorporate legacy otherMediaUrl if not already present
  if (Song.otherMediaUrl && Song.otherMediaUrl.trim() && !addedUrls.has(Song.otherMediaUrl.trim())) {
    const url = Song.otherMediaUrl.trim();
    addedUrls.add(url);
    result.push({
      id: `legacy-other-${Date.now()}`,
      type: detectMediaType(url),
      title: isDirectAudioUrl(url) ? 'Áudio Directo' : 'Link de Mídia',
      url: url,
    });
  }

  return result;
}
