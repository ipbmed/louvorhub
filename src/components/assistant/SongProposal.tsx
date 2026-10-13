import React, { useMemo, useState } from 'react';
import { BookOpen, Check, ExternalLink, ListPlus } from 'lucide-react';
import type { Song } from '@/types';
import type { AssistantSong } from '@/services/assistant';
import { ActionButton, cn } from '../ui';

/** Texto cantado sem cifras `[C]`, marcadores `[REFRAO]` nem comentários `###`. */
export function plainLyrics(lyrics: string): string {
  return (lyrics || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !line.trim().startsWith('###'))
    .map((line) => line.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatShortDate(date: string): string {
  const [, m, d] = date.split('-');
  return d && m ? `${d}/${m}` : date;
}

export function songBadge(kind: string | undefined, number: number | null | undefined): string {
  return kind === 'hino' && number != null ? `#${number}` : '♪';
}

interface SongProposalProps {
  suggestions: AssistantSong[];
  songs: Song[];
  /** Repertório: seleção + adicionar. Catálogo: abrir a música. */
  variant: 'setlist' | 'catalog';
  existingSongIds?: string[];
  canApply?: boolean;
  onAdd?: (songIds: string[]) => Promise<void>;
  onOpen?: (song: Song) => void;
}

export const SongProposal: React.FC<SongProposalProps> = ({
  suggestions,
  songs,
  variant,
  existingSongIds = [],
  canApply = false,
  onAdd,
  onOpen,
}) => {
  const existing = useMemo(() => new Set(existingSongIds), [existingSongIds]);
  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.filter((s) => !s.inRepertoire && !existing.has(s.songId)).map((s) => s.songId)),
  );
  const [openLyrics, setOpenLyrics] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetlist = variant === 'setlist';
  const pending = [...selected].filter((id) => !existing.has(id));

  const toggle = (songId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const add = async () => {
    if (!onAdd || !pending.length) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd(pending);
      setAdded(true);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível adicionar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {suggestions.map((s) => {
        const already = isSetlist && (s.inRepertoire || existing.has(s.songId));
        const isSelected = selected.has(s.songId);
        const song = songsById.get(s.songId);
        const lyricsOpen = openLyrics === s.songId;
        return (
          <div
            key={s.songId}
            className={cn(
              'rounded-xl border text-xs transition-colors',
              already
                ? 'bg-surface-2 border-line opacity-70'
                : isSetlist && isSelected
                  ? 'bg-brand-soft border-brand-line'
                  : 'bg-surface border-line',
            )}
          >
            <div className="flex items-start gap-2.5 px-3 py-2.5">
              {isSetlist && canApply && (
                <button
                  type="button"
                  disabled={already || saving || added}
                  onClick={() => toggle(s.songId)}
                  aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                    already || isSelected ? 'bg-brand border-transparent text-white' : 'border-line-strong',
                  )}
                >
                  {(already || isSelected) && <Check className="w-3.5 h-3.5" />}
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand-text shrink-0">{songBadge(s.kind, s.number)}</span>
                  <span className="truncate font-semibold text-fg">{s.title}</span>
                </div>
                {s.reason && <p className="mt-1 text-fg-muted leading-snug">{s.reason}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                  {already && <span className="text-fg-subtle">Já no repertório</span>}
                  {s.lastPlayedAt && (
                    <span className="text-warning-text">
                      Tocada em {formatShortDate(s.lastPlayedAt)}
                    </span>
                  )}
                  {song && (
                    <button
                      type="button"
                      onClick={() => setOpenLyrics(lyricsOpen ? null : s.songId)}
                      className="inline-flex items-center gap-1 text-fg-muted hover:text-brand-text"
                    >
                      <BookOpen className="w-3 h-3" />
                      {lyricsOpen ? 'Ocultar letra' : 'Ver letra'}
                    </button>
                  )}
                  {song && onOpen && (
                    <button
                      type="button"
                      onClick={() => onOpen(song)}
                      className="inline-flex items-center gap-1 text-fg-muted hover:text-brand-text"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir
                    </button>
                  )}
                </div>
              </div>
            </div>
            {lyricsOpen && song && (
              <pre className="mx-3 mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-fg-muted bg-surface-2 border border-line rounded-lg p-2.5">
                {plainLyrics(song.lyrics)}
              </pre>
            )}
          </div>
        );
      })}

      {isSetlist && canApply && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {error && <p className="text-xs text-danger-text flex-1">{error}</p>}
          <ActionButton
            variant={added ? 'light' : 'primary'}
            icon={added ? Check : ListPlus}
            loading={saving}
            disabled={added || pending.length === 0}
            onClick={() => void add()}
          >
            {added ? 'Adicionadas' : `Adicionar ao repertório${pending.length ? ` (${pending.length})` : ''}`}
          </ActionButton>
        </div>
      )}
    </div>
  );
};
