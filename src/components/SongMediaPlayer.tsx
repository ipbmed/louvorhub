import React, { useState } from 'react';
import { 
  Play, 
  ExternalLink, 
  Youtube, 
  Disc, 
  X, 
  Radio, 
  Music, 
  Volume2, 
  Link as LinkIcon 
} from 'lucide-react';
import { Song, MediaLink, MediaLinkType } from '../types';
import { 
  getCombinedMediaLinks, 
  getYouTubeVideoId, 
  getSpotifyEmbedUrl, 
  isDirectAudioUrl 
} from '../utils/mediaUtils';

interface SongMediaPlayerProps {
  song?: Partial<Song>;
  mediaLinks?: MediaLink[];
  youtubeUrl?: string;
  spotifyUrl?: string;
  otherMediaUrl?: string;
  title?: string;
  compact?: boolean;
}

export const SongMediaPlayer: React.FC<SongMediaPlayerProps> = ({
  song,
  mediaLinks: explicitLinks,
  youtubeUrl,
  spotifyUrl,
  otherMediaUrl,
  title,
  compact = false,
}) => {
  // Combine all media links from song or props
  const allLinks = getCombinedMediaLinks(
    song || { mediaLinks: explicitLinks, youtubeUrl, spotifyUrl, otherMediaUrl }
  );

  // Active embedded media item ID being played
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);

  if (allLinks.length === 0) {
    return null;
  }

  const activeLink = allLinks.find(l => l.id === activeEmbedId);

  // Helper for rendering link badge colors & icons
  const getLinkMeta = (link: MediaLink) => {
    switch (link.type) {
      case 'youtube':
        return {
          icon: <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />,
          label: link.title || 'YouTube',
          bgColor: 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-900/60',
          btnBg: 'bg-red-600 text-white hover:bg-red-500',
          canEmbed: !!getYouTubeVideoId(link.url),
          typeTitle: 'YouTube',
        };
      case 'ytmusic':
        return {
          icon: <Music className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
          label: link.title || 'YouTube Music',
          bgColor: 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-900/60',
          btnBg: 'bg-rose-600 text-white hover:bg-rose-500',
          canEmbed: !!getYouTubeVideoId(link.url),
          typeTitle: 'YouTube Music',
        };
      case 'spotify':
        return {
          icon: <Disc className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
          label: link.title || 'Spotify',
          bgColor: 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-900/60',
          btnBg: 'bg-emerald-600 text-stone-950 hover:bg-emerald-500 font-bold',
          canEmbed: !!getSpotifyEmbedUrl(link.url),
          typeTitle: 'Spotify',
        };
      case 'other':
      default:
        return {
          icon: isDirectAudioUrl(link.url) ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          ),
          label: link.title || (isDirectAudioUrl(link.url) ? 'Áudio MP3' : 'Link de Mídia'),
          bgColor: 'bg-stone-900/90 hover:bg-stone-800 text-stone-200 border-stone-750',
          btnBg: 'bg-emerald-600 text-stone-950 hover:bg-emerald-500 font-bold',
          canEmbed: isDirectAudioUrl(link.url),
          typeTitle: 'Áudio / Link',
        };
    }
  };

  // Compact layout (used on SongCards)
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {allLinks.map((link) => {
          const meta = getLinkMeta(link);
          const isEmbedActive = activeEmbedId === link.id;

          return (
            <div key={link.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (meta.canEmbed) {
                    setActiveEmbedId(isEmbedActive ? null : link.id);
                  } else {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`px-2.5 py-1 rounded-button text-[11px] font-semibold border flex items-center gap-1.5 transition-all shadow-sm ${
                  isEmbedActive
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-extrabold shadow-emerald-500/20'
                    : meta.bgColor
                }`}
                title={`Ouvir/Ver (${meta.typeTitle}): ${link.title || link.url}`}
              >
                {meta.icon}
                <span className="truncate max-w-[120px]">{meta.label}</span>
                {meta.canEmbed && (
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5 shrink-0 opacity-80" />
                )}
              </button>
            </div>
          );
        })}

        {/* Floating Modal Player for Compact Mode */}
        {activeEmbedId && activeLink && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={(e) => {
              e.stopPropagation();
              setActiveEmbedId(null);
            }}
          >
            <div 
              className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getLinkMeta(activeLink).icon}
                  <h4 className="font-serif font-bold text-stone-100 text-xs sm:text-sm truncate max-w-xs sm:max-w-md">
                    {activeLink.title ? `${activeLink.title}` : title || 'Player de Mídia'}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Abrir no App</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setActiveEmbedId(null)}
                    className="p-1 text-stone-400 hover:text-stone-100 rounded-button bg-stone-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Player Body */}
              <div className="p-3 bg-stone-950">
                {(activeLink.type === 'youtube' || activeLink.type === 'ytmusic') && (
                  <div className="aspect-video w-full bg-black rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(activeLink.url)}?autoplay=1`}
                      title={title || 'YouTube Player'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                )}

                {activeLink.type === 'spotify' && getSpotifyEmbedUrl(activeLink.url) && (
                  <div className="rounded-xl overflow-hidden bg-stone-900 border border-stone-800">
                    <iframe
                      src={getSpotifyEmbedUrl(activeLink.url)!}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="border-0"
                    />
                  </div>
                )}

                {activeLink.type === 'other' && isDirectAudioUrl(activeLink.url) && (
                  <div className="p-4 bg-stone-900 rounded-xl border border-stone-800">
                    <audio controls autoPlay src={activeLink.url} className="w-full" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded layout (used on SongDetailModal)
  return (
    <div className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-4 my-4 shadow-inner space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
            Links & Gravações do Louvor
          </h4>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-mono font-bold">
          {allLinks.length} link(s) disponível(is)
        </span>
      </div>

      {/* Media Links Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {allLinks.map((link) => {
          const meta = getLinkMeta(link);
          const isPlaying = activeEmbedId === link.id;

          return (
            <div
              key={link.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isPlaying
                  ? 'bg-stone-900 border-emerald-500 shadow-md shadow-emerald-500/10'
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-stone-950 border border-stone-800 shrink-0">
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-200 truncate">
                      {link.title || meta.typeTitle}
                    </span>
                    {link.title && (
                      <span className="text-[9px] font-mono text-stone-400 bg-stone-950 px-1.5 py-0.2 rounded border border-stone-800 shrink-0">
                        {meta.typeTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-500 font-mono truncate max-w-[160px] sm:max-w-[200px]">
                    {link.url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {meta.canEmbed && (
                  <button
                    type="button"
                    onClick={() => setActiveEmbedId(isPlaying ? null : link.id)}
                    className={`px-2.5 py-1.5 rounded-button text-xs font-semibold flex items-center gap-1 transition-all ${
                      isPlaying
                        ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm'
                        : 'bg-stone-800 text-emerald-400 hover:bg-stone-750 border border-stone-700'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span className="hidden sm:inline">{isPlaying ? 'Ocultar' : 'Ouvir'}</span>
                  </button>
                )}

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition-colors"
                  title="Abrir no aplicativo / site externo"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Player Box */}
      {activeEmbedId && activeLink && (
        <div className="mt-3 rounded-xl overflow-hidden border border-emerald-800/60 bg-stone-950 p-3 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-emerald-300 font-bold flex items-center gap-2">
              {getLinkMeta(activeLink).icon}
              Reproduzindo: {activeLink.title || getLinkMeta(activeLink).typeTitle}
            </span>
            <button
              type="button"
              onClick={() => setActiveEmbedId(null)}
              className="text-stone-400 hover:text-stone-100 p-1 rounded bg-stone-900 border border-stone-800 rounded-button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {(activeLink.type === 'youtube' || activeLink.type === 'ytmusic') && (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-xl">
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeVideoId(activeLink.url)}?autoplay=1`}
                title={title || 'YouTube Player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {activeLink.type === 'spotify' && getSpotifyEmbedUrl(activeLink.url) && (
            <div className="rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shadow-xl">
              <iframe
                src={getSpotifyEmbedUrl(activeLink.url)!}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="border-0"
              />
            </div>
          )}

          {activeLink.type === 'other' && isDirectAudioUrl(activeLink.url) && (
            <div className="p-3 bg-stone-900 rounded-xl border border-stone-800">
              <audio controls autoPlay src={activeLink.url} className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
