import React, { useEffect, useState } from 'react';
import { Song } from '../types';
import { 
  X, 
  Tv, 
  Heart, 
  Volume2, 
  Music2, 
  Plus, 
  Copy, 
  Check, 
  Printer, 
  Edit3, 
  Type, 
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Loader2,
  Link2,
  CalendarDays,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { transposeLyrics, parseLyricSections, filterSectionsForView, stripChords } from '../utils/chordTransposer';
import { isManualSlideBreak } from '../utils/projectionSlides';
import { playReferenceTone, stopReferenceTone } from '../utils/audioTone';
import { MetronomeTool } from './MetronomeTool';
import { SongMediaPlayer } from './SongMediaPlayer';
import { ChordLyricLine } from './ChordLyricLine';
import { LyricSectionHeading } from './LyricSectionHeading';

export interface SongEventVersionInfo {
  title: string;
  date?: string | null;
  time?: string | null;
}

interface SongDetailModalProps {
  song: Song | null;
  /** Quando a visualização é de uma versão personalizada do repertório do evento */
  eventVersion?: SongEventVersionInfo | null;
  isLoading?: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite?: (id: string) => void;
  onOpenProjection: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  isAdmin?: boolean;
  onEditSong?: (song: Song) => void;
}

export const SongDetailModal: React.FC<SongDetailModalProps> = ({
  song,
  eventVersion = null,
  isLoading = false,
  onClose,
  isFavorite,
  onToggleFavorite,
  onOpenProjection,
  onAddToSetlist,
  isAdmin,
  onEditSong,
}) => {
  const [fontSize, setFontSize] = useState<number>(18);
  const [showChords, setShowChords] = useState<boolean>(false);
  const [semitones, setSemitones] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [showMetronome, setShowMetronome] = useState<boolean>(false);
  const [showEventVersionBanner, setShowEventVersionBanner] = useState(true);
  const [showUnreviewedDialog, setShowUnreviewedDialog] = useState(false);
  const [unreviewedAckSongId, setUnreviewedAckSongId] = useState<string | null>(null);

  useEffect(() => {
    setSemitones(0);
    setShowChords(false);
    setShowMetronome(false);
    setCopied(false);
    setLinkCopied(false);
    setShowEventVersionBanner(true);
    setUnreviewedAckSongId(null);
  }, [song?.id, song?.updatedAt, song?.lyrics, eventVersion?.title, eventVersion?.date]);

  useEffect(() => {
    if (!song) return;
    const needsWarning =
      showChords && !song.reviewed && unreviewedAckSongId !== song.id;
    setShowUnreviewedDialog(needsWarning);
  }, [song, showChords, unreviewedAckSongId]);

  const handleToggleChords = () => {
    setShowChords((prev) => {
      const next = !prev;
      if (next && song && !song.reviewed && unreviewedAckSongId !== song.id) {
        setShowUnreviewedDialog(true);
      }
      return next;
    });
  };

  const dismissUnreviewedDialog = () => {
    if (song) setUnreviewedAckSongId(song.id);
    setShowUnreviewedDialog(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (isLoading || !song) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col animate-in fade-in duration-200 text-stone-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-100 rounded-button z-10"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs font-medium text-stone-400">Carregando música…</p>
        </div>
      </div>
    );
  }

  const processedLyrics = semitones !== 0 
    ? transposeLyrics(song.lyrics, semitones) 
    : song.lyrics;

  const sections = filterSectionsForView(
    parseLyricSections(processedLyrics),
    showChords ? 'chords' : 'lyrics',
  );

  const handleCopyLyrics = () => {
    const textToCopy = sections
      .map((sec) => {
        const body = showChords
          ? sec.lines.join('\n')
          : sec.lines.map((l) => stripChords(l)).join('\n');
        return sec.type === 'comment'
          ? `### ${body}`
          : `${sec.label}${sec.annotation ? `: ${sec.annotation}` : ''}\n${body}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(`${song.number}. ${song.title}\n\n${textToCopy}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isHino = (song.songType || (song.number ? 'hino' : 'cantico')) === 'hino';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col overflow-hidden animate-in fade-in duration-200 text-stone-100">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-stone-900 border-b border-stone-800 flex items-start justify-between gap-4 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {isHino && song.number != null && (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-emerald-300 text-xl shadow-inner shrink-0">
                #{song.number}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {eventVersion && (
                  <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Versão do evento
                  </span>
                )}
                {!song.reviewed && (
                  <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-200 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Não revisada
                  </span>
                )}
                {song.category && (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-semibold">
                    {song.category}
                  </span>
                )}
                {isHino ? (
                  <span className="px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 rounded-full text-xs font-semibold">
                    {song.hymnal || 'Novo Cântico'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-teal-950/80 border border-teal-800/60 text-teal-300 rounded-full text-xs font-semibold">
                    Cântico
                  </span>
                )}
                {song.originalKey && (
                  <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-300 rounded-md text-xs font-mono">
                    Tom: <strong>{song.originalKey}</strong>
                  </span>
                )}
                {song.timeSignature && (
                  <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 rounded-md text-xs font-mono">
                    {song.timeSignature}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-emerald-100 mt-1">
                {song.title}
              </h2>
              {song.subtitle && (
                <p className="text-xs sm:text-sm text-stone-400 font-serif italic">
                  {song.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Projection Mode */}
            <button
              onClick={() => onOpenProjection(song)}
              className="px-3 py-2 bg-emerald-500 text-stone-950 font-bold rounded-button text-xs flex items-center gap-1.5 shadow-md hover:bg-emerald-400 transition-colors"
              title="Abrir no Telão / Projeção"
            >
              <Tv className="w-4 h-4" />
              <span className="hidden sm:inline">Telão</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="p-2 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button transition-colors"
              title="Copiar link da música"
            >
              {linkCopied ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Link2 className="w-5 h-5" />
              )}
            </button>

            {/* Favorite */}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(song.id)}
                className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-button transition-colors"
                title="Favorito"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-button transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Reader Controls Toolbar */}
        <div className="bg-stone-950/70 border-b border-stone-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Left Controls: Font size, Chords Toggle, Transposition */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Font Size */}
            <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-1 gap-1">
              <span className="text-stone-400 px-1 font-mono text-[10px] uppercase">Fonte</span>
              <button
                onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-bold rounded-button"
                title="Diminuir fonte"
              >
                A-
              </button>
              <span className="px-1 font-mono font-bold text-emerald-300">{fontSize}px</span>
              <button
                onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-bold rounded-button"
                title="Aumentar fonte"
              >
                A+
              </button>
            </div>

            {/* Chords Toggle */}
            <button
              onClick={handleToggleChords}
              className={`px-3 py-1.5 rounded-button font-medium border flex items-center gap-1.5 transition-colors ${
                showChords 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                  : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Cifras</span>
            </button>

            {/* Transpose Controls */}
            {showChords && (
              <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-1 gap-1">
                <span className="text-stone-400 px-1 font-mono text-[10px] uppercase">Tom</span>
                <button
                  onClick={() => setSemitones(prev => prev - 1)}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-bold rounded-button"
                  title="Abaixar meio tom"
                >
                  -1
                </button>
                <span className={`px-1.5 font-mono font-bold ${semitones !== 0 ? 'text-emerald-400' : 'text-stone-300'}`}>
                  {semitones > 0 ? `+${semitones}` : semitones}
                </span>
                <button
                  onClick={() => setSemitones(prev => prev + 1)}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-bold rounded-button"
                  title="Aumentar meio tom"
                >
                  +1
                </button>
                {semitones !== 0 && (
                  <button
                    onClick={() => setSemitones(0)}
                    className="p-1 text-emerald-400 hover:text-emerald-200 rounded-button"
                    title="Restaurar Tom Original"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Right Tools: Reference Pitch Tone & Metronome */}
          <div className="flex items-center gap-2">
            
            {/* Tone Pitch Sound */}
            <button
              onClick={() => playReferenceTone(song.originalKey || 'C')}
              className="px-2.5 py-1.5 bg-stone-900 hover:bg-emerald-900/40 text-stone-300 hover:text-emerald-300 border border-stone-800 rounded-button flex items-center gap-1 font-mono transition-colors"
              title="Ouvir Nota de Afinação para o Tom"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Som ({song.originalKey || 'C'})</span>
            </button>

            {/* Metronome Tool Toggle */}
            <button
              onClick={() => setShowMetronome(!showMetronome)}
              className={`p-1.5 rounded-button border transition-colors ${
                showMetronome ? 'bg-emerald-500 text-stone-950 border-emerald-400' : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
              }`}
              title="Metrônomo para ritmo"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Copy Lyrics */}
            <button
              onClick={handleCopyLyrics}
              className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-button border border-stone-800 transition-colors"
              title="Copiar Letra"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Add to Setlist */}
            {onAddToSetlist && (
              <button
                onClick={() => onAddToSetlist(song)}
                className="p-1.5 bg-stone-900 hover:bg-stone-800 text-emerald-300 rounded-button border border-stone-800 transition-colors"
                title="Adicionar à playlist"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {/* Admin Edit */}
            {isAdmin && onEditSong && (
              <button
                onClick={() => onEditSong(song)}
                className="p-1.5 bg-blue-950/60 hover:bg-blue-900 text-blue-300 rounded-button border border-blue-800/60 transition-colors"
                title="Editar Música"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>

        {eventVersion && showEventVersionBanner && (
          <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/25 text-amber-100 flex items-start sm:items-center gap-2">
            <p className="text-xs sm:text-sm flex items-start sm:items-center gap-2 flex-wrap flex-1 min-w-0">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300 mt-0.5 sm:mt-0" />
              <span>
                Versão personalizada para o evento{' '}
                <strong className="text-amber-50">{eventVersion.title}</strong>
                {eventVersion.date && (
                  <>
                    {' '}
                    <span className="inline-flex items-center gap-1 text-amber-200/90">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {new Date(eventVersion.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {eventVersion.time ? ` · ${eventVersion.time.slice(0, 5)}` : ''}
                    </span>
                  </>
                )}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setShowEventVersionBanner(false)}
              className="p-1 rounded-button text-amber-200/80 hover:text-amber-50 hover:bg-amber-500/20 transition-colors shrink-0"
              title="Fechar"
              aria-label="Fechar aviso da versão"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metronome Drawer */}
        {showMetronome && (
          <div className="bg-stone-950 border-b border-stone-800 p-4 animate-in slide-in-from-top duration-200">
            <MetronomeTool initialBpm={song.bpm ?? 90} />
          </div>
        )}

        {/* Lyrics Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          
          {/* Song Media Player (YouTube, YouTube Music, Spotify & Audio) */}
          <SongMediaPlayer 
            song={song} 
            title={song.title} 
          />

          {sections.map((section, idx) => {
            const isChorus = section.type === 'chorus';
            const isComment = section.type === 'comment';

            return (
              <div
                key={idx}
                className={`p-4 sm:p-5 rounded-2xl transition-all ${
                  isComment
                    ? 'bg-amber-950/20 border border-amber-500/25 border-dashed'
                    : isChorus
                      ? 'bg-emerald-950/30 border-l-4 border-emerald-500/80 shadow-md shadow-emerald-950/20'
                      : 'bg-stone-900/40 border border-stone-800/60'
                }`}
                style={{ fontSize: `${fontSize}px` }}
              >
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-stone-800/40">
                  <LyricSectionHeading
                    label={section.label}
                    annotation={section.annotation}
                    className={`text-xs font-mono font-bold ${
                      isComment
                        ? 'text-amber-300/90'
                        : isChorus
                          ? 'text-emerald-400'
                          : 'text-stone-400'
                    }`}
                  />
                </div>

                <div
                  className={`space-y-2.5 ${
                    isComment
                      ? 'font-sans italic text-amber-100/80'
                      : showChords
                        ? 'font-mono font-normal tracking-normal'
                        : 'font-serif font-medium tracking-wide'
                  }`}
                >
                  {section.lines.map((line, lineIdx) =>
                    isComment ? (
                      <p key={lineIdx} className="leading-relaxed">
                        {line || '\u00A0'}
                      </p>
                    ) : isManualSlideBreak(line) ? (
                      <div
                        key={lineIdx}
                        className="my-3 border-t border-dashed border-stone-600/70"
                        title="Quebra de página no telão"
                      />
                    ) : (
                      <ChordLyricLine
                        key={lineIdx}
                        line={line}
                        showChords={showChords}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}

          {/* Credits / Authorship */}
          {(song.author || song.composer || song.instructions) && (
            <div className="pt-6 border-t border-stone-800 text-xs text-stone-400 space-y-1">
              {song.author && <p><strong>Letra:</strong> {song.author}</p>}
              {song.composer && <p><strong>Música:</strong> {song.composer}</p>}
              {song.instructions && <p><strong>Instruções:</strong> {song.instructions}</p>}
            </div>
          )}
        </div>

        {showUnreviewedDialog && (
          <div className="absolute inset-0 z-40 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="unreviewed-title"
              className="w-full max-w-md bg-stone-900 border border-amber-500/40 rounded-2xl shadow-2xl p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="unreviewed-title" className="text-base font-display font-bold text-amber-100">
                    Cifra não revisada
                  </h3>
                  <p className="mt-2 text-sm text-stone-300 leading-relaxed">
                    Esta música ainda não foi revisada. Confira a cifra disponibilizada antes de usar
                    no ensaio ou no culto.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={dismissUnreviewedDialog}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-button"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
