import React from 'react';
import { Song } from '../types';
import { Heart, Tv, Edit3, Trash2, Plus, Maximize2 } from 'lucide-react';
import { SongMetaBadge } from './SongMetaBadge';

interface SongListRowProps {
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

export const SongListRow: React.FC<SongListRowProps> = ({
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
  const isHino = (song.songType || (song.number ? 'hino' : 'cantico')) === 'hino';

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 sm:px-4 bg-stone-900/70 hover:bg-stone-800/90 border border-stone-800 hover:border-emerald-700/40 rounded-xl transition-colors">
      <button
        type="button"
        onClick={() => onSelectSong(song)}
        className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-button"
      >
        {isHino && song.number != null ? (
          <SongMetaBadge variant="number">#{song.number}</SongMetaBadge>
        ) : (
          <SongMetaBadge variant="cantico">Cânt.</SongMetaBadge>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="truncate font-serif font-semibold text-stone-100 light:text-stone-900 group-hover:text-emerald-300 light:group-hover:text-emerald-700 text-sm sm:text-base">
              {song.title}
            </span>
            {song.originalKey && (
              <span className="shrink-0 text-[10px] font-mono text-stone-500 light:text-stone-600">{song.originalKey}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500 light:text-stone-600 truncate">
            {song.author && <span className="truncate">{song.author}</span>}
            {song.category && (
              <>
                {song.author && <span>·</span>}
                <span className="truncate">{song.category}</span>
              </>
            )}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-0.5 shrink-0">
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(song.id)}
            className="p-1.5 text-stone-400 hover:text-rose-400 rounded-button"
            title="Favorito"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenProjection(song)}
          className="group/tv p-1.5 text-stone-400 hover:text-emerald-300 rounded-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          title="Telão"
          aria-label="Abrir no telão"
        >
          <Tv className="w-3.5 h-3.5 group-hover/tv:hidden group-focus-visible/tv:hidden" aria-hidden />
          <Maximize2 className="w-3.5 h-3.5 hidden group-hover/tv:block group-focus-visible/tv:block" aria-hidden />
        </button>
        {onAddToSetlist && (
          <button
            type="button"
            onClick={() => onAddToSetlist(song)}
            className="p-1.5 text-stone-400 hover:text-emerald-300 rounded-button"
            title="Adicionar à playlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
        {isAdmin && onEditSong && (
          <button
            type="button"
            onClick={() => onEditSong(song)}
            className="p-1.5 text-stone-400 hover:text-blue-300 rounded-button"
            title="Editar"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
        {isAdmin && onDeleteSong && (
          <button
            type="button"
            onClick={() => onDeleteSong(song)}
            className="p-1.5 text-stone-400 hover:text-rose-300 rounded-button"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
