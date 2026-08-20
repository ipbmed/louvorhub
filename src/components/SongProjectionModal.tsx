import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Song, ThemeMode } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Palette,
  Maximize2,
  Minimize2,
  Settings2,
  Rows3,
  ALargeSmall,
  ScrollText,
  Minus,
  Plus,
} from 'lucide-react';
import { parseLyricSections, stripChords, filterSectionsForView } from '../utils/chordTransposer';
import { LyricSectionHeading } from './LyricSectionHeading';
import {
  buildProjectionSlides,
  bumpFontPx,
  loadProjectionLayoutSettings,
  saveProjectionLayoutSettings,
  slideJumpLabel,
  slideJumpTitle,
  type ProjectionLayoutMode,
  type ProjectionLayoutSettings,
} from '../utils/projectionSlides';

interface SongProjectionModalProps {
  songsSequence: Song[];
  initialIndex?: number;
  onClose: () => void;
}

const LINE_OPTIONS = [2, 3, 4, 5, 6, 8] as const;

export const SongProjectionModal: React.FC<SongProjectionModalProps> = ({
  songsSequence,
  initialIndex = 0,
  onClose,
}) => {
  const [songIdx, setSongIdx] = useState<number>(initialIndex);
  const [slideIdx, setSlideIdx] = useState<number>(0);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [layout, setLayout] = useState<ProjectionLayoutSettings>(() => loadProjectionLayoutSettings());

  const currentSong = songsSequence[songIdx] || songsSequence[0];

  const slides = useMemo(() => {
    if (!currentSong) return [];
    const cleanLyrics = stripChords(currentSong.lyrics);
    const sections = filterSectionsForView(parseLyricSections(cleanLyrics), 'lyrics');
    return buildProjectionSlides(sections, layout);
  }, [currentSong, layout]);

  const currentSlide = slides[slideIdx] || slides[0];
  const isFontMode = layout.mode === 'font';

  useEffect(() => {
    saveProjectionLayoutSettings(layout);
  }, [layout]);

  const handleNextSlide = useCallback(() => {
    if (slideIdx < slides.length - 1) {
      setSlideIdx(slideIdx + 1);
      return;
    }
    if (songIdx < songsSequence.length - 1) {
      setSongIdx(songIdx + 1);
      setSlideIdx(0);
    }
  }, [slideIdx, slides.length, songIdx, songsSequence.length]);

  const handlePrevSlide = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx(slideIdx - 1);
      return;
    }
    if (songIdx > 0) {
      const prev = songsSequence[songIdx - 1];
      const prevSlides = buildProjectionSlides(
        filterSectionsForView(parseLyricSections(stripChords(prev.lyrics)), 'lyrics'),
        layout,
      );
      setSongIdx(songIdx - 1);
      setSlideIdx(Math.max(0, prevSlides.length - 1));
    }
  }, [slideIdx, songIdx, songsSequence, layout]);

  const nudgeFont = useCallback((direction: 1 | -1) => {
    setLayout((prev) => ({
      ...prev,
      mode: 'font',
      fontPx: bumpFontPx(prev.fontPx, direction),
    }));
  }, []);

  useEffect(() => {
    setSlideIdx(0);
  }, [layout.mode, layout.linesPerSlide]);

  useEffect(() => {
    if (slideIdx >= slides.length && slides.length > 0) {
      setSlideIdx(slides.length - 1);
    }
  }, [slides.length, slideIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === '+' || e.key === '=') {
        if (isFontMode) {
          e.preventDefault();
          nudgeFont(1);
        }
      } else if (e.key === '-' || e.key === '_') {
        if (isFontMode) {
          e.preventDefault();
          nudgeFont(-1);
        }
      } else if (e.key === 'Escape') {
        if (showLayoutMenu) setShowLayoutMenu(false);
        else onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, onClose, showLayoutMenu, isFontMode, nudgeFont]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const setMode = (mode: ProjectionLayoutMode) => {
    setLayout((prev) => ({ ...prev, mode }));
    if (mode === 'scroll') setShowLayoutMenu(false);
  };

  const setLinesPerSlide = (linesPerSlide: number) => {
    setLayout((prev) => ({ ...prev, mode: 'chunks', linesPerSlide }));
  };

  if (!currentSong) return null;

  const themeClasses: Record<
    ThemeMode,
    { bg: string; text: string; accent: string; cardBg: string; border: string }
  > = {
    dark: {
      bg: 'bg-stone-950',
      text: 'text-stone-100',
      accent: 'text-emerald-400',
      cardBg: 'bg-stone-900/90',
      border: 'border-emerald-500/30',
    },
    light: {
      bg: 'bg-stone-100',
      text: 'text-stone-900',
      accent: 'text-emerald-700',
      cardBg: 'bg-white/90',
      border: 'border-stone-300',
    },
    navy: {
      bg: 'bg-slate-950',
      text: 'text-slate-100',
      accent: 'text-emerald-300',
      cardBg: 'bg-slate-900/90',
      border: 'border-emerald-400/30',
    },
  };

  const currentTheme = themeClasses[theme];

  const contentFontClass = isFontMode
    ? ''
    : layout.mode === 'scroll'
      ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
      : 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl';

  const layoutButtonLabel =
    layout.mode === 'chunks'
      ? `${layout.linesPerSlide} linhas`
      : layout.mode === 'font'
        ? `Fonte ${layout.fontPx}`
        : 'Rolagem';

  return (
    <div
      className={`fixed inset-0 z-50 ${currentTheme.bg} ${currentTheme.text} flex flex-col justify-between transition-colors duration-300 select-none`}
    >
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-stone-800/40 opacity-80 hover:opacity-100 transition-opacity relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          {currentSong.number ? (
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono font-black rounded-xl text-lg border border-emerald-500/40 shrink-0">
              #{currentSong.number}
            </div>
          ) : (
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded-xl text-xs uppercase border border-emerald-500/40 shrink-0">
              Cântico
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-serif font-bold tracking-tight truncate">
              {currentSong.title}
            </h1>
            <p className="text-xs text-emerald-300/80 uppercase tracking-widest font-mono truncate">
              {currentSong.hymnal ? `${currentSong.hymnal} · ` : ''}
              {currentSong.category}
            </p>
          </div>

          {currentSlide && (
            <LyricSectionHeading
              label={currentSlide.label}
              annotation={
                currentSlide.partCount > 1
                  ? `${currentSlide.annotation ? `${currentSlide.annotation} · ` : ''}${currentSlide.partIndex}/${currentSlide.partCount}`
                  : currentSlide.annotation
              }
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold border shrink-0 ${currentTheme.border} ${
                currentSlide.type === 'chorus'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-stone-800/50 text-stone-300'
              }`}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isFontMode && (
            <div className="flex items-center gap-0.5 bg-stone-800/60 rounded-button p-0.5 mr-1">
              <button
                type="button"
                onClick={() => nudgeFont(-1)}
                className="p-1.5 text-stone-300 hover:text-stone-100 hover:bg-stone-700 rounded-button"
                title="Diminuir fonte (−)"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-1.5 min-w-[2.75rem] text-center font-mono text-[11px] font-bold text-stone-200">
                {layout.fontPx}
              </span>
              <button
                type="button"
                onClick={() => nudgeFont(1)}
                className="p-1.5 text-stone-300 hover:text-stone-100 hover:bg-stone-700 rounded-button"
                title="Aumentar fonte (+)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayoutMenu((v) => !v)}
              className={`p-2 rounded-button transition-colors flex items-center gap-1.5 ${
                showLayoutMenu ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800/60 text-stone-300'
              }`}
              title="Layout do telão"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">{layoutButtonLabel}</span>
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl p-3 z-30">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 px-1 mb-2">
                  Layout do slide
                </p>

                <button
                  type="button"
                  onClick={() => setMode('chunks')}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left mb-1 ${
                    layout.mode === 'chunks'
                      ? 'bg-emerald-500/15 border border-emerald-500/40'
                      : 'hover:bg-stone-800 border border-transparent'
                  }`}
                >
                  <Rows3 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold text-stone-100">Linhas por slide</span>
                    <span className="block text-[11px] text-stone-400">
                      Quebra automática + respeita ---
                    </span>
                  </span>
                </button>

                {layout.mode === 'chunks' && (
                  <div className="flex flex-wrap gap-1.5 px-1 pb-2 mb-1">
                    {LINE_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setLinesPerSlide(n)}
                        className={`px-2.5 py-1 rounded-button text-xs font-mono font-bold border ${
                          layout.linesPerSlide === n
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                            : 'bg-stone-950 text-stone-300 border-stone-700 hover:border-stone-500'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMode('font')}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left mb-1 ${
                    isFontMode
                      ? 'bg-emerald-500/15 border border-emerald-500/40'
                      : 'hover:bg-stone-800 border border-transparent'
                  }`}
                >
                  <ALargeSmall className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold text-stone-100">Fonte</span>
                    <span className="block text-[11px] text-stone-400">
                      Seção inteira (ou até ---), tamanho fixo
                    </span>
                  </span>
                </button>

                {isFontMode && (
                  <div className="flex items-center justify-center gap-2 px-1 pb-2 mb-1">
                    <button
                      type="button"
                      onClick={() => nudgeFont(-1)}
                      className="p-2 rounded-button bg-stone-950 border border-stone-700 text-stone-200 hover:border-emerald-500/50"
                      title="Diminuir"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-sm font-bold text-stone-100 min-w-[3.5rem] text-center">
                      {layout.fontPx}px
                    </span>
                    <button
                      type="button"
                      onClick={() => nudgeFont(1)}
                      className="p-2 rounded-button bg-stone-950 border border-stone-700 text-stone-200 hover:border-emerald-500/50"
                      title="Aumentar"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMode('scroll')}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left ${
                    layout.mode === 'scroll'
                      ? 'bg-emerald-500/15 border border-emerald-500/40'
                      : 'hover:bg-stone-800 border border-transparent'
                  }`}
                >
                  <ScrollText className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold text-stone-100">Rolagem</span>
                    <span className="block text-[11px] text-stone-400">
                      Seção longa com scroll vertical
                    </span>
                  </span>
                </button>

                <p className="mt-2.5 px-1 text-[10px] text-stone-500 leading-relaxed">
                  Na letra, use uma linha só com <span className="font-mono text-stone-300">---</span>{' '}
                  para forçar nova página. No modo fonte, +/− também no teclado.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-2 rounded-button transition-colors ${theme === 'dark' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800/60 text-stone-300'}`}
            title="Tema Escuro"
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-2 rounded-button transition-colors ${theme === 'light' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800/60 text-stone-300'}`}
            title="Tema Claro"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('navy')}
            className={`p-2 rounded-button transition-colors ${theme === 'navy' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800/60 text-stone-300'}`}
            title="Tema Azul Sacro"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-stone-800/60 hover:bg-stone-700 text-stone-300 rounded-button transition-colors"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-rose-950/60 text-rose-300 hover:bg-rose-900 rounded-button transition-colors ml-2"
            title="Sair do Modo Telão"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 flex flex-col items-center px-4 sm:px-8 py-6 sm:py-10 text-center w-full max-w-none ${
          layout.mode === 'scroll' || isFontMode
            ? 'justify-start overflow-y-auto'
            : 'justify-center overflow-hidden'
        }`}
        onClick={() => showLayoutMenu && setShowLayoutMenu(false)}
      >
        {currentSlide && (
          <div
            style={isFontMode ? { fontSize: `${layout.fontPx}px` } : undefined}
            className={`w-full font-serif font-bold leading-tight sm:leading-relaxed tracking-wide drop-shadow-md space-y-[0.6em] my-auto ${contentFontClass}`}
          >
            {currentSlide.lines.map((line, idx) => (
              <p key={idx} className="transition-all duration-300">
                {line}
              </p>
            ))}
          </div>
        )}

        {!currentSlide && (
          <p className="text-stone-500 text-sm">Nenhum trecho para projetar nesta música.</p>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t border-stone-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-2 sm:pb-0">
          {slides.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSlideIdx(idx)}
              title={slideJumpTitle(sec)}
              aria-label={slideJumpTitle(sec)}
              className={`px-2 py-1 rounded-button text-[11px] font-bold font-mono transition-all border whitespace-nowrap ${
                slideIdx === idx
                  ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md'
                  : 'bg-stone-900/60 text-stone-300 border-stone-800 hover:bg-stone-800'
              }`}
            >
              {slideJumpLabel(sec)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={slideIdx === 0 && songIdx === 0}
            className="p-3 bg-stone-900 border border-stone-800 hover:bg-emerald-500 hover:text-stone-950 disabled:opacity-30 disabled:pointer-events-none rounded-button transition-all shadow-md"
            title="Slide Anterior (Seta Esquerda)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="font-mono text-xs font-semibold px-2">
            {slides.length ? `${slideIdx + 1} / ${slides.length}` : '0 / 0'}
          </span>

          <button
            type="button"
            onClick={handleNextSlide}
            disabled={slideIdx >= slides.length - 1 && songIdx >= songsSequence.length - 1}
            className="p-3 bg-stone-900 border border-stone-800 hover:bg-emerald-500 hover:text-stone-950 disabled:opacity-30 disabled:pointer-events-none rounded-button transition-all shadow-md"
            title="Próximo Slide (Seta Direita / Espaço)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
