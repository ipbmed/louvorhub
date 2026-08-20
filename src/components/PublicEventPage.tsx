import React, { useEffect, useMemo, useState } from 'react';
import { Link, useMatch } from 'react-router-dom';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  ListMusic,
  Loader2,
  Lock,
  MessageCircle,
  Music,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  eventShareUrl,
  getPublicEvent,
  type PublicEventShare,
  type PublicEventSong,
} from '@/services/eventShare';
import { ChordLyricLine } from './ChordLyricLine';

interface PublicEventPageProps {
  shareCode?: string;
}

export const PublicEventPage: React.FC<PublicEventPageProps> = ({ shareCode: shareCodeProp }) => {
  const match = useMatch('/evento/:shareCode');
  const shareCode = shareCodeProp || match?.params.shareCode || '';
  const [data, setData] = useState<PublicEventShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (!shareCode) {
      setError('Link de compartilhamento inválido.');
      setData(null);
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const result = await getPublicEvent(shareCode);
        if (cancelled) return;
        if (!result) {
          setError('Evento não encontrado ou o compartilhamento está desativado.');
          setData(null);
          return;
        }
        setData(result);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Não foi possível abrir o evento.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  const shareUrl = shareCode ? eventShareUrl(shareCode) : '';

  const dateLabel = useMemo(() => {
    if (!data?.event.date) return '';
    return new Date(data.event.date + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [data?.event.date]);

  const buildText = () => {
    if (!data) return '';
    let text = `📅 *${data.event.title}*\n${dateLabel}`;
    if (data.event.time) text += ` · ${data.event.time.slice(0, 5)}`;
    text += `\n`;
    if (data.event.theme) text += `Tema: ${data.event.theme}\n`;
    text += `\n`;

    if (data.liturgy) {
      text += `📖 *Liturgia*\n`;
      data.liturgy.items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.title}\n`;
      });
      text += `\n`;
    }

    if (data.songs) {
      text += `🎵 *Músicas*\n`;
      data.songs.forEach((s, idx) => {
        text += `${idx + 1}. ${s.number ? `#${s.number} - ` : ''}${s.title}`;
        if (s.originalKey) text += ` (${s.originalKey})`;
        text += `\n`;
      });
      text += `\n`;
    }

    if (data.team) {
      text += `👥 *Equipe*\n`;
      data.team.forEach((m) => {
        text += `• ${m.roleLabel}: ${m.personName || '—'}\n`;
      });
      text += `\n`;
    }

    text += `🔗 ${shareUrl}\n\n✨ LouvorHub`;
    return text;
  };

  const toggleSong = (song: PublicEventSong) => {
    setExpandedSongId((prev) => (prev === song.eventSongId ? null : song.eventSongId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-sm font-display font-bold text-emerald-300 hover:text-emerald-200">
            LouvorHub
          </Link>
          <Link to="/" className="text-xs text-stone-500 hover:text-stone-300">
            Ir ao app
          </Link>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-sm text-rose-100 flex gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {data && !error && (
          <>
            <header className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono capitalize">
                <Calendar className="w-3.5 h-3.5" />
                {dateLabel}
                {data.event.time ? ` · ${data.event.time.slice(0, 5)}` : ''}
              </div>
              <h1 className="text-2xl font-display font-bold text-stone-50">{data.event.title}</h1>
              {data.event.theme && (
                <p className="text-sm text-stone-400">Tema: {data.event.theme}</p>
              )}
            </header>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-button text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                Copiar link
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(buildText())}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-button text-xs font-bold inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>

            {data.liturgy && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Liturgia
                </h2>
                {(data.liturgy.preacher || data.liturgy.leader || data.liturgy.bibleVerse) && (
                  <div className="text-xs text-stone-400 space-y-0.5 bg-stone-900/60 border border-stone-800 rounded-xl px-3 py-2">
                    {data.liturgy.bibleVerse && <p>Texto: {data.liturgy.bibleVerse}</p>}
                    {data.liturgy.preacher && <p>Pregador: {data.liturgy.preacher}</p>}
                    {data.liturgy.leader && <p>Liturgo: {data.liturgy.leader}</p>}
                  </div>
                )}
                {data.liturgy.items.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">Liturgia sem itens.</p>
                ) : (
                  <ol className="space-y-2">
                    {data.liturgy.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="bg-stone-900 border border-stone-800 rounded-2xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-stone-800 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-display font-bold text-stone-100">{item.title}</p>
                            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-stone-500">
                              {item.responsible && <span>{item.responsible}</span>}
                              {item.duration && <span>{item.duration}</span>}
                            </div>
                            {item.body && (
                              <p className="text-xs text-stone-400 mt-2 whitespace-pre-wrap">
                                {item.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            {data.songs && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-emerald-400" />
                  Músicas
                  <span className="text-stone-500 font-mono font-normal">
                    ({data.songs.length})
                  </span>
                </h2>
                {data.songs.length === 0 ? (
                  <div className="text-center py-8 text-stone-500">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma música no repertório.</p>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {data.songs.map((song, idx) => {
                      const open = expandedSongId === song.eventSongId;
                      return (
                        <li
                          key={song.eventSongId}
                          className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSong(song)}
                            className="w-full p-4 flex items-center gap-3 text-left hover:bg-stone-800/40 transition-colors"
                          >
                            <span className="w-7 h-7 rounded-lg bg-stone-800 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-display font-bold text-stone-100 truncate">
                                {song.number ? `#${song.number} · ` : ''}
                                {song.title}
                              </p>
                              <p className="text-xs text-stone-500 mt-0.5 flex flex-wrap items-center gap-2">
                                {song.originalKey ? `Tom ${song.originalKey}` : '—'}
                                {song.bpm != null ? ` · ${song.bpm} BPM` : ''}
                                {song.hasVersion && (
                                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                                    <Sparkles className="w-3 h-3" />
                                    Versão
                                  </span>
                                )}
                              </p>
                            </div>
                            {open ? (
                              <ChevronUp className="w-4 h-4 text-stone-500 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                            )}
                          </button>
                          {open && (
                            <div className="px-4 pb-4 border-t border-stone-800 pt-3 space-y-1.5">
                              {song.instructions && (
                                <p className="text-xs text-amber-200/90 mb-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                                  {song.instructions}
                                </p>
                              )}
                              {(song.lyrics || 'Sem letra.')
                                .split('\n')
                                .map((line, idx) => (
                                  <ChordLyricLine
                                    key={idx}
                                    line={line}
                                    showChords
                                    className="text-xs text-stone-300"
                                  />
                                ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}

            {data.team && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Equipe
                </h2>
                {data.team.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">Nenhuma pessoa na escala.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.team.map((member) => (
                      <li
                        key={member.id}
                        className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <span className="text-xs font-bold text-emerald-300">{member.roleLabel}</span>
                        <span className="text-sm text-stone-100 truncate">
                          {member.personName || '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
