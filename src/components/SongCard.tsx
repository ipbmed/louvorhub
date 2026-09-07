import React from 'react';
import { Song } from '../types';
import { Heart, Music, Tv, Edit3, Trash2, ListMusic, Volume2, Eye, Maximize2 } from 'lucide-react';
import { stripChords } from '../utils/chordTransposer';
import { playReferenceTone } from '../utils/audioTone';
import { SongMediaPlayer } from './SongMediaPlayer';
import { SongMetaBadge } from './SongMetaBadge';

interface SongCardProps {
  song: Song;
  isFavorite: boolean;
  onToggleFavorite?: (id: string) => void;
  onSelectSong: (song: Song) => void;
  onOpenProjection: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  isAdmin?: boolean;
  onEditSong?: (song: Song) => void;
  onDeleteSong?: (song: Song) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isFavorite,
  onToggleFavorite,
  onSelectSong,
  onOpenProjection,
  onAddToSetlist,
  isAdmin,
  onEditSong,
  onDeleteSong,
}) => {
  // Extract first 2 lines of lyrics without chords for preview
  const cleanLyrics = stripChords(song.lyrics);
  const previewLines = cleanLyrics
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('[') && !line.startsWith('REFRÃO') && !line.startsWith('CORO'))
    .slice(0, 2)
    .join(' · ');

  const isHino = (song.songType || (song.number ? 'hino' : 'cantico')) === 'hino';

  const iconActionBtn =
    'cursor-pointer p-1.5 bg-stone-800 light:bg-white hover:bg-emerald-900/50 light:hover:bg-emerald-100 text-stone-300 light:text-stone-600 hover:text-emerald-200 light:hover:text-emerald-800 rounded-button border border-stone-700 light:border-stone-300 hover:border-emerald-500/50 light:hover:border-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50';

  return (
    <div className="group bg-stone-900/80 hover:bg-stone-800/90 border border-stone-800 hover:border-emerald-600/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between relative overflow-hidden">
      
      {/* Decorative background accent */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />

      {/* Top row: Number/Type, Category, Actions */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {isHino && song.number ? (
              <SongMetaBadge variant="number">#{song.number}</SongMetaBadge>
            ) : (
              <SongMetaBadge variant="cantico">Cântico</SongMetaBadge>
            )}
            {song.category ? (
              <SongMetaBadge variant="category">{song.category}</SongMetaBadge>
            ) : null}
            {isHino && (
              <SongMetaBadge variant="hymnal">
                {song.hymnal || 'Novo Cântico'}
              </SongMetaBadge>
            )}
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1">
            {/* Audio key preview tone */}
            {song.originalKey && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void playReferenceTone(song.originalKey || 'C');
                }}
                className="cursor-pointer px-2 py-1 bg-stone-800/80 light:bg-white hover:bg-emerald-900/50 light:hover:bg-emerald-100 hover:text-emerald-200 light:hover:text-emerald-800 text-stone-400 light:text-stone-600 rounded-button text-xs font-mono font-bold border border-stone-700/60 light:border-stone-300 hover:border-emerald-500/50 light:hover:border-emerald-400 flex items-center gap-1 transition-colors"
                title={`Tom: ${song.originalKey} - Ouvir nota de afinação`}
              >
                <Volume2 className="w-3 h-3 text-emerald-400 light:text-emerald-600" />
                {song.originalKey}
              </button>
            )}

            {/* Favorite button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(song.id);
                }}
                className="cursor-pointer p-1.5 bg-transparent light:bg-transparent hover:bg-rose-950/40 light:hover:bg-rose-100 text-stone-400 hover:text-rose-400 light:hover:text-rose-700 rounded-button border border-transparent hover:border-rose-500/30 light:hover:border-rose-300 transition-colors"
                title={isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {song.subtitle && (
          <p className="text-xs text-stone-400 light:text-stone-500 font-serif italic truncate mb-2">
            {song.subtitle}
          </p>
        )}

        {/* Title */}
        <h3 
          onClick={() => onSelectSong(song)}
          className="text-lg sm:text-xl font-serif font-bold text-stone-100 light:text-stone-900 group-hover:text-emerald-300 light:group-hover:text-emerald-700 transition-colors cursor-pointer leading-tight mb-2 line-clamp-2"
        >
          {song.title}
        </h3>

        {/* Lyrics Snippet Preview */}
        {previewLines && (
          <p className="text-xs sm:text-sm text-stone-400 light:text-stone-600 font-sans italic line-clamp-2 mb-3 leading-relaxed">
            "{previewLines}..."
          </p>
        )}

        {/* Media Badges (YouTube / YouTube Music / Spotify / Audio) */}
        {(song.youtubeUrl || song.spotifyUrl || song.otherMediaUrl || (song.mediaLinks && song.mediaLinks.length > 0)) && (
          <div className="mb-3">
            <SongMediaPlayer 
              song={song}
              title={song.title} 
              compact={true} 
            />
          </div>
        )}
      </div>

      {/* Bottom Metadata & Quick Action Toolbar */}
      <div className="relative z-10 pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2 mt-2 text-xs text-stone-400">
        
        {/* Author */}
        <div className="truncate text-[11px] min-w-0">
          {song.author ? (
            <span className="truncate block font-medium text-stone-400">{song.author}</span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Add to Setlist */}
          {onAddToSetlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToSetlist(song);
              }}
              className={iconActionBtn}
              title="Adicionar à playlist"
              aria-label="Adicionar à playlist"
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Projection button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProjection(song);
            }}
            className={`group/tv ${iconActionBtn} hover:bg-emerald-800/60 light:hover:bg-emerald-200`}
            title="Abrir no Modo Projeção / Telão"
            aria-label="Abrir no telão"
          >
            <Tv className="w-3.5 h-3.5 group-hover/tv:hidden group-focus-visible/tv:hidden" aria-hidden />
            <Maximize2 className="w-3.5 h-3.5 hidden group-hover/tv:block group-focus-visible/tv:block" aria-hidden />
          </button>

          {/* Admin Edit/Delete */}
          {isAdmin && onEditSong && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditSong(song);
              }}
              className={`${iconActionBtn} hover:bg-blue-900/50 light:hover:bg-blue-100 light:hover:border-blue-400 hover:text-blue-200 light:hover:text-blue-800`}
              title="Editar Música"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {isAdmin && onDeleteSong && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSong(song);
              }}
              className={`${iconActionBtn} hover:bg-rose-900/50 light:hover:bg-rose-100 light:hover:border-rose-400 hover:text-rose-200 light:hover:text-rose-800`}
              title="Excluir Música"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Read Lyrics Primary Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSong(song);
            }}
            className="group/ver cursor-pointer ml-1 px-3 py-1.5 bg-emerald-500/10 light:bg-emerald-50 hover:bg-emerald-500 light:hover:bg-emerald-500 hover:text-stone-950 light:hover:text-stone-950 focus-visible:bg-emerald-500 focus-visible:text-stone-950 text-emerald-300 light:text-emerald-700 font-semibold rounded-button text-xs border border-emerald-500/30 light:border-emerald-300 hover:border-emerald-400 light:hover:border-emerald-500 transition-all flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
          >
            <Music className="w-3 h-3 group-hover/ver:hidden group-focus-visible/ver:hidden" aria-hidden />
            <Eye className="w-3 h-3 hidden group-hover/ver:block group-focus-visible/ver:block" aria-hidden />
            Ver
          </button>
        </div>

      </div>

    </div>
  );
};
