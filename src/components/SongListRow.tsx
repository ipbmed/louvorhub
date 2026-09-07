import React, { useEffect, useId, useRef, useState } from 'react';
import { Song } from '../types';
import {
  Heart,
  Tv,
  Edit3,
  Trash2,
  ListMusic,
  Maximize2,
  MoreVertical,
} from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const runAndClose = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  const iconBtn =
    'p-1.5 text-stone-400 hover:text-emerald-300 rounded-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50';

  return (
    <div className="group relative flex items-center gap-3 px-3 py-2.5 sm:px-4 bg-stone-900/70 hover:bg-stone-800/90 border border-stone-800 hover:border-emerald-700/40 rounded-xl transition-colors">
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
              <span className="shrink-0 text-[10px] font-mono text-stone-500 light:text-stone-600">
                {song.originalKey}
              </span>
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

      {/* Desktop: ícones individuais */}
      <div className="hidden sm:flex items-center gap-0.5 shrink-0">
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(song.id)}
            className={iconBtn}
            title="Favorito"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenProjection(song)}
          className={`group/tv ${iconBtn}`}
          title="Telão"
          aria-label="Abrir no telão"
        >
          <Tv className="w-3.5 h-3.5 group-hover/tv:hidden group-focus-visible/tv:hidden" aria-hidden />
          <Maximize2
            className="w-3.5 h-3.5 hidden group-hover/tv:block group-focus-visible/tv:block"
            aria-hidden
          />
        </button>
        {onAddToSetlist && (
          <button
            type="button"
            onClick={() => onAddToSetlist(song)}
            className="p-1.5 bg-stone-800 light:bg-white hover:bg-emerald-900/50 light:hover:bg-emerald-100 text-emerald-300 light:text-emerald-700 hover:text-emerald-200 light:hover:text-emerald-800 rounded-button border border-stone-700 light:border-stone-300 hover:border-emerald-500/50 light:hover:border-emerald-400 transition-colors"
            title="Adicionar à playlist"
            aria-label="Adicionar à playlist"
          >
            <ListMusic className="w-3.5 h-3.5" />
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

      {/* Mobile: menu ⋯ */}
      <div className="relative sm:hidden shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 text-stone-300 light:text-stone-700 hover:bg-stone-800 light:hover:bg-stone-100 rounded-button border border-stone-700/80 light:border-stone-300"
          aria-label="Mais ações"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 top-full mt-1 z-30 min-w-[11.5rem] py-1 rounded-xl border border-stone-700 light:border-stone-200 bg-stone-900 light:bg-white shadow-xl overflow-hidden"
          >
            {onToggleFavorite && (
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onToggleFavorite(song.id))}
                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 light:text-stone-800 hover:bg-stone-800 light:hover:bg-stone-100 flex items-center gap-2.5"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`}
                />
                {isFavorite ? 'Remover favorito' : 'Favoritar'}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onOpenProjection(song))}
              className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 light:text-stone-800 hover:bg-stone-800 light:hover:bg-stone-100 flex items-center gap-2.5"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              Telão
            </button>
            {onAddToSetlist && (
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onAddToSetlist(song))}
                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 light:text-stone-800 hover:bg-stone-800 light:hover:bg-stone-100 flex items-center gap-2.5"
              >
                <ListMusic className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                Adicionar à playlist
              </button>
            )}
            {isAdmin && onEditSong && (
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onEditSong(song))}
                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 light:text-stone-800 hover:bg-stone-800 light:hover:bg-stone-100 flex items-center gap-2.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-300 light:text-blue-600" />
                Editar
              </button>
            )}
            {isAdmin && onDeleteSong && (
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onDeleteSong(song))}
                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-rose-300 light:text-rose-600 hover:bg-rose-950/40 light:hover:bg-rose-50 flex items-center gap-2.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
