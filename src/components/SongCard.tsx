import React from 'react';
import { Song } from '../types';
import { Heart, Music, Tv, Edit3, Trash2, Plus, Volume2 } from 'lucide-react';
import { stripChords } from '../utils/chordTransposer';
import { playReferenceTone } from '../utils/audioTone';
import { SongMediaPlayer } from './SongMediaPlayer';

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

  return (
    <div className="group bg-stone-900/80 hover:bg-stone-800/90 border border-stone-800 hover:border-emerald-600/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col justify-between relative overflow-hidden">
      
      {/* Decorative background accent */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />

      {/* Top row: Number/Type, Category, Actions */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          
          <div className="flex items-center gap-2.5">
            {/* Song Number Badge or Cantico Badge */}
            {isHino && song.number ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/40 flex items-center justify-center font-mono font-black text-emerald-300 text-lg shadow-inner shrink-0">
                #{song.number}
              </div>
            ) : (
              <div className="px-2.5 py-1.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-900/40 border border-teal-500/40 flex items-center justify-center font-mono font-bold text-teal-300 text-xs shadow-inner shrink-0">
                Cântico
              </div>
            )}

            {/* Category tag & hymnal name */}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {song.category ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[11px] font-semibold text-emerald-200/90 uppercase tracking-wider">
                    {song.category}
                  </span>
                ) : null}
                {isHino && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-medium text-emerald-300">
                    {song.hymnal || 'Novo Cântico'}
                  </span>
                )}
              </div>
              {song.subtitle && (
                <p className="text-xs text-stone-400 font-serif italic truncate max-w-[180px] mt-0.5">
                  {song.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-1">
            {/* Audio key preview tone */}
            {song.originalKey && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playReferenceTone(song.originalKey || 'C');
                }}
                className="px-2 py-1 bg-stone-800/80 hover:bg-emerald-950/80 hover:text-emerald-300 text-stone-400 rounded-button text-xs font-mono font-bold border border-stone-700/60 flex items-center gap-1 transition-colors"
                title={`Tom: ${song.originalKey} - Ouvir nota de afinação`}
              >
                <Volume2 className="w-3 h-3 text-emerald-400" />
                {song.originalKey}
              </button>
            )}

            {/* Favorite button */}
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(song.id);
                }}
                className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-rose-400 rounded-button transition-colors"
                title={isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 
          onClick={() => onSelectSong(song)}
          className="text-lg sm:text-xl font-serif font-bold text-stone-100 group-hover:text-emerald-200 transition-colors cursor-pointer leading-tight mb-2 line-clamp-2"
        >
          {song.title}
        </h3>

        {/* Lyrics Snippet Preview */}
        {previewLines && (
          <p className="text-xs sm:text-sm text-stone-400 font-sans italic line-clamp-2 mb-3 leading-relaxed">
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
      <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2 mt-2 text-xs text-stone-400">
        
        {/* Author */}
        <div className="truncate text-[11px]">
          {song.author ? (
            <span className="truncate block font-medium text-stone-400">{song.author}</span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Add to Setlist */}
          {onAddToSetlist && (
            <button
              onClick={() => onAddToSetlist(song)}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-emerald-300 rounded-button border border-stone-700 transition-colors"
              title="Adicionar à playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Projection button */}
          <button
            onClick={() => onOpenProjection(song)}
            className="p-1.5 bg-stone-800 hover:bg-emerald-950/80 text-stone-300 hover:text-emerald-300 rounded-button border border-stone-700 transition-colors"
            title="Abrir no Modo Projeção / Telão"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          {/* Admin Edit/Delete */}
          {isAdmin && onEditSong && (
            <button
              onClick={() => onEditSong(song)}
              className="p-1.5 bg-stone-800 hover:bg-blue-900/50 text-stone-300 hover:text-blue-300 rounded-button border border-stone-700 transition-colors"
              title="Editar Música"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {isAdmin && onDeleteSong && (
            <button
              onClick={() => onDeleteSong(song)}
              className="p-1.5 bg-stone-800 hover:bg-rose-900/50 text-stone-300 hover:text-rose-300 rounded-button border border-stone-700 transition-colors"
              title="Excluir Música"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Read Lyrics Primary Button */}
          <button
            onClick={() => onSelectSong(song)}
            className="ml-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-stone-950 text-emerald-300 font-semibold rounded-button text-xs border border-emerald-500/30 transition-all flex items-center gap-1"
          >
            <Music className="w-3 h-3" />
            Ver
          </button>
        </div>

      </div>

    </div>
  );
};
