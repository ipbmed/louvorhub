import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import type { AssistantScreen } from '@/contexts/AssistantProvider';
import {
  askAssistant,
  type AssistantMessage,
  type AssistantMode,
  type AssistantRequest,
} from '@/services/assistant';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLockDocumentScroll } from '@/hooks/useLockDocumentScroll';
import { ActionButton, IconButton, cn } from '../ui';
import { SongProposal } from './SongProposal';
import { LiturgyProposal } from './LiturgyProposal';
import { TeamProposal } from './TeamProposal';

interface Conversation {
  messages: AssistantMessage[];
  theme: string;
  bibleVerse: string;
  avoidWeeks: number;
}

export const MODE_TITLE: Record<AssistantMode, string> = {
  setlist: 'Músicas para o repertório',
  playlist: 'Músicas para a playlist',
  liturgy: 'Ordem do culto',
  schedule: 'Escala da equipe',
  catalog: 'Busca no catálogo',
};

const QUICK_PROMPTS: Record<AssistantMode, string[]> = {
  setlist: [
    'Sugira as músicas para este culto.',
    'Quero 2 hinos e 3 cânticos.',
    'Algo mais contemplativo para o final.',
  ],
  playlist: [
    'Sugira músicas para esta playlist.',
    'Hinos sobre a cruz para meditar.',
    'Complete com cânticos no mesmo estilo.',
  ],
  liturgy: [
    'Monte a liturgia completa deste culto.',
    'Inclua a Ceia do Senhor.',
    'Sugira leituras para a confissão de pecados.',
  ],
  schedule: [
    'Monte a escala deste culto.',
    'Equipe reduzida: vocal, violão e projeção.',
    'Distribua melhor quem tocou muito nas últimas semanas.',
  ],
  catalog: ['Músicas sobre a graça de Deus', 'Hinos para a Ceia do Senhor', 'Cânticos baseados nos Salmos'],
};

const AVOID_WEEKS_OPTIONS = [0, 4, 6, 8, 12];

function newConversation(screen: AssistantScreen): Conversation {
  return {
    messages: [],
    theme: 'theme' in screen ? screen.theme || '' : '',
    bibleVerse: 'bibleVerse' in screen ? screen.bibleVerse || '' : '',
    avoidWeeks: screen.mode === 'schedule' ? 8 : 6,
  };
}

function buildRequest(screen: AssistantScreen, conv: Conversation, messages: AssistantMessage[]): AssistantRequest {
  const base = { mode: screen.mode, messages };
  switch (screen.mode) {
    case 'catalog':
      return base;
    case 'playlist':
      return {
        ...base,
        theme: conv.theme,
        bibleVerse: conv.bibleVerse,
        playlist: { title: screen.playlistTitle, songIds: screen.existingSongIds },
      };
    case 'setlist':
      return {
        ...base,
        eventId: screen.eventId,
        theme: conv.theme,
        bibleVerse: conv.bibleVerse,
        avoidWeeks: conv.avoidWeeks,
      };
    case 'liturgy':
      return {
        ...base,
        eventId: screen.eventId,
        theme: conv.theme,
        bibleVerse: conv.bibleVerse,
        avoidWeeks: conv.avoidWeeks,
        liturgy: {
          preacher: screen.preacher,
          leader: screen.leader,
          items: screen.items.map(({ type, title, details, songId, responsible, duration }) => ({
            type,
            title,
            details,
            songId,
            responsible,
            duration,
          })),
        },
      };
    case 'schedule':
      return {
        ...base,
        eventId: screen.eventId,
        theme: conv.theme,
        avoidWeeks: conv.avoidWeeks,
        team: {
          members: screen.members,
          roles: screen.roles,
          assignments: screen.assignments.map((a) => ({
            memberId: a.memberId || screen.members.find((m) => a.userId && m.userId === a.userId)?.id,
            userId: a.userId,
            memberName: a.memberName,
            role: a.role,
          })),
        },
      };
  }
}

const inputClass =
  'w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand/30';

interface AssistantLauncherProps {
  screen: AssistantScreen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Painel de chat do assistente, ciente da tela atual (aberto pelo botão do cabeçalho). */
export const AssistantLauncher: React.FC<AssistantLauncherProps> = ({ screen, open, onOpenChange: setOpen }) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useLockDocumentScroll(open && !isDesktop);

  const key = screen?.key ?? '';
  const conv = screen ? conversations[key] ?? newConversation(screen) : null;

  useEffect(() => {
    setError(null);
    setInput('');
    setContextOpen(!conversations[key]?.messages.length);
  }, [key]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [conv?.messages.length, loading, open]);

  if (!screen || !conv) return null;

  const update = (patch: Partial<Conversation>) =>
    setConversations((prev) => ({ ...prev, [key]: { ...(prev[key] ?? newConversation(screen)), ...patch } }));

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const requestKey = key;
    const history: AssistantMessage[] = [...conv.messages, { role: 'user', content }];
    update({ messages: history });
    setInput('');
    setError(null);
    setContextOpen(false);
    setLoading(true);
    try {
      const res = await askAssistant(buildRequest(screen, conv, history));
      setConversations((prev) => {
        const current = prev[requestKey];
        if (!current) return prev;
        return {
          ...prev,
          [requestKey]: {
            ...current,
            messages: [
              ...history,
              {
                role: 'assistant',
                content: res.message,
                songs: res.songs,
                liturgyItems: res.liturgyItems,
                assignments: res.assignments,
              },
            ],
          },
        };
      });
    } catch (err) {
      setError((err as Error).message || 'Não foi possível consultar o assistente.');
      setConversations((prev) =>
        prev[requestKey] ? { ...prev, [requestKey]: { ...prev[requestKey], messages: conv.messages } } : prev,
      );
      setInput(content);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setConversations((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setError(null);
    setContextOpen(true);
  };

  const renderProposal = (m: AssistantMessage) => {
    if (m.songs?.length && screen.mode === 'playlist') {
      return (
        <SongProposal
          variant="setlist"
          suggestions={m.songs}
          songs={screen.songs}
          existingSongIds={screen.existingSongIds}
          canApply={screen.canApply}
          onAdd={screen.onAddSongs}
          addLabel="Adicionar à playlist"
          existingLabel="Já na playlist"
        />
      );
    }
    if (m.songs?.length && (screen.mode === 'setlist' || screen.mode === 'catalog')) {
      return screen.mode === 'setlist' ? (
        <SongProposal
          variant="setlist"
          suggestions={m.songs}
          songs={screen.songs}
          existingSongIds={screen.existingSongIds}
          canApply={screen.canApply}
          onAdd={screen.onAddSongs}
        />
      ) : (
        <SongProposal
          variant="catalog"
          suggestions={m.songs}
          songs={screen.songs}
          onOpen={(song) => {
            screen.onOpenSong(song);
            if (!isDesktop) setOpen(false);
          }}
          onAddToPlaylist={screen.onAddToPlaylist}
        />
      );
    }
    if (m.liturgyItems?.length && screen.mode === 'liturgy') {
      return (
        <LiturgyProposal
          items={m.liturgyItems}
          currentCount={screen.items.length}
          canApply={screen.canApply}
          onApply={(items) =>
            screen.onApplyLiturgy(items, { theme: conv.theme, bibleVerse: conv.bibleVerse })
          }
        />
      );
    }
    if (m.assignments?.length && screen.mode === 'schedule') {
      return (
        <TeamProposal
          assignments={m.assignments}
          currentCount={screen.assignments.length}
          canApply={screen.canApply}
          onApply={screen.onApplyTeam}
        />
      );
    }
    return null;
  };

  const isPlaylist = screen.mode === 'playlist';
  const hasThemeFields = screen.mode !== 'catalog';
  const hasVerseField = screen.mode === 'setlist' || screen.mode === 'liturgy' || isPlaylist;
  const contextTitle = isPlaylist ? 'Contexto da playlist' : 'Contexto do culto';
  const contextSummary =
    [conv.theme && `Tema: ${conv.theme}`, hasVerseField && conv.bibleVerse && `Texto: ${conv.bibleVerse}`]
      .filter(Boolean)
      .join(' · ') || contextTitle;
  const noMembers = screen.mode === 'schedule' && screen.members.length === 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] lg:inset-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-[440px] flex">
      <div
        role="dialog"
        aria-label="Assistente"
        className="flex-1 flex flex-col bg-surface lg:border-l border-line shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200 pt-safe"
      >
        <header className="flex items-start gap-3 px-4 py-3 border-b border-line shrink-0">
          <span className="w-9 h-9 rounded-xl bg-brand-soft text-brand-text flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-fg">{MODE_TITLE[screen.mode]}</h2>
            <p className="text-xs text-fg-muted truncate">{screen.label}</p>
          </div>
          {conv.messages.length > 0 && (
            <IconButton icon={RotateCcw} label="Nova conversa" variant="ghost" size="sm" onClick={reset} />
          )}
          <IconButton icon={X} label="Fechar" variant="ghost" size="sm" onClick={() => setOpen(false)} />
        </header>

        {hasThemeFields && (
          <div className="px-4 py-2.5 border-b border-line shrink-0">
            <button
              type="button"
              onClick={() => setContextOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs text-fg-muted"
            >
              <span className="truncate font-medium">{contextOpen ? contextTitle : contextSummary}</span>
              {contextOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            {contextOpen && (
              <div className="mt-2.5 space-y-2">
                <input
                  value={conv.theme}
                  onChange={(e) => update({ theme: e.target.value })}
                  placeholder="Tema (ex.: A graça que salva)"
                  className={inputClass}
                />
                {hasVerseField && (
                  <input
                    value={conv.bibleVerse}
                    onChange={(e) => update({ bibleVerse: e.target.value })}
                    placeholder="Texto bíblico (ex.: Efésios 2.1-10)"
                    className={inputClass}
                  />
                )}
                {!isPlaylist && (
                  <label className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                    {screen.mode === 'schedule'
                      ? 'Considerar escalas das últimas'
                      : 'Evitar músicas tocadas nas últimas'}
                    <select
                      value={conv.avoidWeeks}
                      onChange={(e) => update({ avoidWeeks: Number(e.target.value) })}
                      className="bg-surface-2 border border-line rounded-lg px-2 py-1 text-xs text-fg"
                    >
                      {AVOID_WEEKS_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {w === 0 ? (screen.mode === 'schedule' ? 'nenhuma' : 'não evitar') : `${w} semanas`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 min-h-0">
          {noMembers && (
            <p className="text-xs rounded-xl border border-warning-line bg-warning-soft text-warning-text px-3 py-2">
              Nenhum integrante encontrado. Vincule um grupo de louvor ao evento para o assistente montar a escala.
            </p>
          )}

          {conv.messages.length === 0 && !loading && (
            <div className="text-center py-6 px-2 space-y-3">
              <p className="text-xs text-fg-muted">
                {screen.mode === 'catalog'
                  ? 'Descreva o assunto, a ocasião ou um trecho da letra que você procura.'
                  : 'Peça uma proposta e refine na conversa. Nada é gravado até você clicar em aplicar.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS[screen.mode].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => void send(p)}
                    className="px-3 py-1.5 rounded-full border border-line text-[11px] text-fg-muted hover:text-fg hover:border-brand-line"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conv.messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand text-brand-fg px-3 py-2 text-xs whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={i} className="space-y-2">
                {m.content && (
                  <p className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface-2 text-fg px-3 py-2 text-xs whitespace-pre-wrap">
                    {m.content}
                  </p>
                )}
                {renderProposal(m)}
              </div>
            ),
          )}

          {loading && (
            <p className="text-xs text-fg-muted flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-brand-text" />
              Pensando...
            </p>
          )}
        </div>

        <div className="p-3 border-t border-line shrink-0 space-y-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {error && <p className="text-xs text-danger-text">{error}</p>}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={conv.messages.length ? 'Refine a proposta...' : 'Escreva seu pedido...'}
              className={cn(inputClass, 'flex-1 resize-none max-h-28')}
            />
            <ActionButton
              type="submit"
              variant="primary"
              icon={Send}
              loading={loading}
              disabled={!input.trim()}
              aria-label="Enviar"
              title="Enviar"
            />
          </form>
        </div>
      </div>
    </div>
  );
};
