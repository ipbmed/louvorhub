import React, { useEffect, useState } from 'react';
import { 
  Play, 
  ExternalLink, 
  Youtube, 
  Disc, 
  X, 
  Radio, 
  Music, 
  Volume2, 
  Link as LinkIcon,
  ChevronDown,
  RectangleHorizontal,
  Square,
  Maximize2,
  PictureInPicture2,
} from 'lucide-react';
import { Song, MediaLink } from '../types';
import { 
  getCombinedMediaLinks, 
  getYouTubeVideoId, 
  getSpotifyEmbedUrl, 
  isDirectAudioUrl 
} from '../utils/mediaUtils';

type YoutubeViewMode = 'compact' | 'normal' | 'wide' | 'featured';

const YT_VIEW_MODES: {
  id: YoutubeViewMode;
  label: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'compact',
    label: 'Pequeno',
    title: 'Player compacto',
    icon: <Square className="w-3.5 h-3.5" />,
  },
  {
    id: 'normal',
    label: 'Médio',
    title: 'Tamanho médio',
    icon: <RectangleHorizontal className="w-3.5 h-3.5" />,
  },
  {
    id: 'wide',
    label: 'Amplo',
    title: 'Largura total',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'featured',
    label: 'Destacado',
    title: 'Sobrepor na tela',
    icon: <PictureInPicture2 className="w-3.5 h-3.5" />,
  },
];

function youtubeFrameClass(mode: YoutubeViewMode): string {
  switch (mode) {
    case 'compact':
      return 'aspect-video w-full max-w-[16rem] sm:max-w-xs mx-auto';
    case 'normal':
      return 'aspect-video w-full max-w-xl sm:max-w-2xl mx-auto';
    case 'wide':
    case 'featured':
    default:
      return 'aspect-video w-full';
  }
}

interface SongMediaPlayerProps {
  song?: Partial<Song>;
  mediaLinks?: MediaLink[];
  youtubeUrl?: string;
  spotifyUrl?: string;
  otherMediaUrl?: string;
  title?: string;
  compact?: boolean;
  /** Quando definido, o painel é controlado pelo pai (toolbar da letra). */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
}

export const SongMediaPlayer: React.FC<SongMediaPlayerProps> = ({
  song,
  mediaLinks: explicitLinks,
  youtubeUrl,
  spotifyUrl,
  otherMediaUrl,
  title,
  compact = false,
  expanded,
  onExpandedChange,
}) => {
  const allLinks = getCombinedMediaLinks(
    song || { mediaLinks: explicitLinks, youtubeUrl, spotifyUrl, otherMediaUrl }
  );

  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [ytViewMode, setYtViewMode] = useState<YoutubeViewMode>('normal');
  const mediaExpanded = expanded ?? internalExpanded;
  const setMediaExpanded = (open: boolean) => {
    if (onExpandedChange) onExpandedChange(open);
    else setInternalExpanded(open);
  };

  useEffect(() => {
    if (!activeEmbedId) setYtViewMode('normal');
  }, [activeEmbedId]);

  if (allLinks.length === 0) {
    return null;
  }

  const activeLink = allLinks.find(l => l.id === activeEmbedId);
  const isYoutubeEmbed =
    !!activeLink && (activeLink.type === 'youtube' || activeLink.type === 'ytmusic');

  const renderYoutubeControls = () => (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-900 light:bg-stone-100 border border-stone-800 light:border-stone-200"
      role="group"
      aria-label="Tamanho do vídeo"
    >
      {YT_VIEW_MODES.map((mode) => {
        const active = ytViewMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setYtViewMode(mode.id)}
            className={`px-1.5 sm:px-2 py-1 rounded-md text-[10px] font-semibold inline-flex items-center gap-1 transition-colors ${
              active
                ? 'bg-emerald-500 text-stone-950'
                : 'text-stone-400 light:text-stone-600 hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-white'
            }`}
            title={mode.title}
            aria-pressed={active}
          >
            {mode.icon}
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderYoutubePlayer = (mode: YoutubeViewMode, className = '') => {
    if (!activeLink) return null;
    const videoId = getYouTubeVideoId(activeLink.url);
    if (!videoId) return null;
    return (
      <div className={`${youtubeFrameClass(mode)} rounded-xl overflow-hidden bg-black shadow-xl ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title || 'YouTube Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  };

  // Helper for rendering link badge colors & icons
  const getLinkMeta = (link: MediaLink) => {
    switch (link.type) {
      case 'youtube':
        return {
          icon: <Youtube className="w-3.5 h-3.5 text-red-400 light:text-red-600 shrink-0" />,
          label: link.title || 'YouTube',
          bgColor:
            'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-900/60 light:bg-red-50 light:hover:bg-red-100 light:text-red-800 light:border-red-300',
          btnBg: 'bg-red-600 text-white hover:bg-red-500',
          canEmbed: !!getYouTubeVideoId(link.url),
          typeTitle: 'YouTube',
        };
      case 'ytmusic':
        return {
          icon: <Music className="w-3.5 h-3.5 text-rose-400 light:text-rose-600 shrink-0" />,
          label: link.title || 'YouTube Music',
          bgColor:
            'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-900/60 light:bg-rose-50 light:hover:bg-rose-100 light:text-rose-800 light:border-rose-300',
          btnBg: 'bg-rose-600 text-white hover:bg-rose-500',
          canEmbed: !!getYouTubeVideoId(link.url),
          typeTitle: 'YouTube Music',
        };
      case 'spotify':
        return {
          icon: <Disc className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />,
          label: link.title || 'Spotify',
          bgColor:
            'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-900/60 light:bg-emerald-50 light:hover:bg-emerald-100 light:text-emerald-800 light:border-emerald-300',
          btnBg: 'bg-emerald-600 text-stone-950 hover:bg-emerald-500 font-bold',
          canEmbed: !!getSpotifyEmbedUrl(link.url),
          typeTitle: 'Spotify',
        };
      case 'other':
      default:
        return {
          icon: isDirectAudioUrl(link.url) ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
          ) : (
            <LinkIcon className="w-3.5 h-3.5 text-stone-400 light:text-stone-600 shrink-0" />
          ),
          label: link.title || (isDirectAudioUrl(link.url) ? 'Áudio MP3' : 'Link de Mídia'),
          bgColor:
            'bg-stone-900/90 hover:bg-stone-800 text-stone-200 border-stone-700 light:bg-stone-50 light:hover:bg-stone-100 light:text-stone-800 light:border-stone-300',
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

  // Expanded layout (used on SongDetailModal) — collapsed by default
  if (!mediaExpanded) {
    if (expanded !== undefined) return null;
    return (
      <div className="my-2">
        <button
          type="button"
          onClick={() => setMediaExpanded(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-button text-xs font-semibold border transition-colors bg-stone-800 light:bg-white border-stone-700 light:border-stone-300 text-stone-200 light:text-stone-800 hover:border-emerald-500/50 light:hover:border-emerald-400 hover:text-emerald-300 light:hover:text-emerald-700"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" aria-hidden />
          <span>Links</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 text-emerald-300 light:text-emerald-800">
            {allLinks.length}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400 light:text-stone-500" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" aria-hidden />
          <h4 className="text-xs font-bold text-stone-100 light:text-stone-900 uppercase tracking-wider truncate">
            Links
          </h4>
        </div>
        <button
          type="button"
          onClick={() => {
            setMediaExpanded(false);
            setActiveEmbedId(null);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-button text-[10px] font-semibold text-stone-400 light:text-stone-600 hover:text-stone-100 light:hover:text-stone-900 hover:bg-stone-800 light:hover:bg-stone-100 transition-colors shrink-0"
          title="Fechar links"
          aria-label="Fechar links"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">Fechar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {allLinks.map((link) => {
          const meta = getLinkMeta(link);
          const isPlaying = activeEmbedId === link.id;

          return (
            <div
              key={link.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isPlaying
                  ? 'bg-stone-950 light:bg-emerald-50 border-emerald-500 light:border-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'bg-stone-950/60 light:bg-stone-50 border-stone-800 light:border-stone-200 hover:border-stone-700 light:hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-stone-900 light:bg-white border border-stone-800 light:border-stone-200 shrink-0">
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-100 light:text-stone-900 truncate">
                      {link.title || meta.typeTitle}
                    </span>
                    {link.title && (
                      <span className="text-[9px] font-mono text-stone-400 light:text-stone-600 bg-stone-900 light:bg-stone-100 px-1.5 py-0.5 rounded border border-stone-800 light:border-stone-200 shrink-0">
                        {meta.typeTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-500 light:text-stone-500 font-mono truncate max-w-[160px] sm:max-w-[200px]">
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
                        : 'bg-stone-800 light:bg-white text-emerald-400 light:text-emerald-700 border border-stone-700 light:border-stone-300 hover:bg-stone-700 light:hover:bg-emerald-50'
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
                  className="p-1.5 bg-stone-800 light:bg-white hover:bg-stone-700 light:hover:bg-stone-100 text-stone-300 light:text-stone-700 rounded-lg border border-stone-700 light:border-stone-300 transition-colors"
                  title="Abrir no aplicativo / site externo"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {activeEmbedId && activeLink && ytViewMode === 'featured' && isYoutubeEmbed && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setYtViewMode('normal')}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {getLinkMeta(activeLink).icon}
                <h4 className="font-serif font-bold text-stone-100 text-xs sm:text-sm truncate">
                  {activeLink.title || title || 'YouTube'}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {renderYoutubeControls()}
                <a
                  href={activeLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:underline hidden sm:inline-flex items-center gap-1 font-semibold"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveEmbedId(null)}
                  className="p-1 text-stone-400 hover:text-stone-100 rounded-button bg-stone-800"
                  title="Fechar player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 bg-stone-950">{renderYoutubePlayer('featured')}</div>
          </div>
        </div>
      )}

      {activeEmbedId && activeLink && !(ytViewMode === 'featured' && isYoutubeEmbed) && (
        <div className="mt-1 rounded-xl overflow-hidden border border-emerald-800/60 light:border-emerald-300 bg-stone-950 light:bg-stone-50 p-3 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2 text-xs px-1">
            <span className="text-emerald-300 light:text-emerald-800 font-bold flex items-center gap-2 min-w-0 truncate">
              {getLinkMeta(activeLink).icon}
              <span className="truncate">
                Reproduzindo: {activeLink.title || getLinkMeta(activeLink).typeTitle}
              </span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isYoutubeEmbed && renderYoutubeControls()}
              <button
                type="button"
                onClick={() => setActiveEmbedId(null)}
                className="text-stone-400 light:text-stone-600 hover:text-stone-100 light:hover:text-stone-900 p-1 rounded bg-stone-900 light:bg-white border border-stone-800 light:border-stone-200 rounded-button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isYoutubeEmbed && renderYoutubePlayer(ytViewMode)}

          {activeLink.type === 'spotify' && getSpotifyEmbedUrl(activeLink.url) && (
            <div className="rounded-xl overflow-hidden bg-stone-900 light:bg-white border border-stone-800 light:border-stone-200 shadow-xl">
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
            <div className="p-3 bg-stone-900 light:bg-white rounded-xl border border-stone-800 light:border-stone-200">
              <audio controls autoPlay src={activeLink.url} className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
