import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Guitar,
  Link2,
  ListMusic,
  Loader2,
  Lock,
  Maximize2,
  MessageCircle,
  Music,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import { getSetlistByShareCode, setlistShareUrl } from '@/services/playlists';
import * as songsService from '@/services/songs';
import { requireSupabase } from '@/lib/supabase';
import { stripChords } from '@/utils/chordTransposer';
import type { Setlist, Song } from '@/types';
import { ShareQrCode } from './ShareQrCode';
import { ChordLyricLine } from './ChordLyricLine';
import { SongDetailModal } from './SongDetailModal';
import { SongProjectionModal } from './SongProjectionModal';
import { ThemeToggle } from './ThemeToggle';

interface PublicSetlistPageProps {
  shareCode?: string;
}

interface PublicSongRow {
  id: string;
  title: string;
  number?: number | null;
  originalKey?: string | null;
  lyrics?: string;
}

export const PublicSetlistPage: React.FC<PublicSetlistPageProps> = ({ shareCode: shareCodeProp }) => {
  const params = useParams<{ shareCode: string }>();
  const shareCode = shareCodeProp || params.shareCode;
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<PublicSongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [showChords, setShowChords] = useState(false);
  const [detailSong, setDetailSong] = useState<Song | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [projectionSongs, setProjectionSongs] = useState<Song[] | null>(null);

  const openSongDialog = async (songId: string) => {
    setDetailLoading(true);
    setDetailSong(null);
    try {
      const full = await songsService.getSong(songId);
      if (full) setDetailSong(full);
    } catch {
      setDetailSong(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!shareCode) {
      setLoading(false);
      setError('Link de playlist inválido.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const list = await getSetlistByShareCode(shareCode);
        if (cancelled) return;
        if (!list) {
          setError('Playlist não encontrada.');
          setSetlist(null);
          return;
        }
        if (list.visibility !== 'public_link') {
          setError('Esta playlist é privada. Faça login ou peça acesso ao criador.');
          setSetlist(list);
          setSongs([]);
          return;
        }
        setSetlist(list);

        const ids = list.items.map((i) => i.songId);
        if (!ids.length) {
          setSongs([]);
          return;
        }
        const sb = requireSupabase();
        const { data, error: songErr } = await sb
          .from('songs')
          .select('id, title, number, musical_key, lyrics_md')
          .in('id', ids);
        if (songErr) throw songErr;
        const byId = new Map<string, PublicSongRow>();
        for (const s of data || []) {
          byId.set(s.id as string, {
            id: s.id as string,
            title: s.title as string,
            number: (s.number as number | null) ?? null,
            originalKey: (s.musical_key as string | null) ?? null,
            lyrics: (s.lyrics_md as string | null) || '',
          });
        }
        setSongs(
          list.items.map((i) => byId.get(i.songId)).filter((s): s is PublicSongRow => s != null),
        );
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Não foi possível abrir a playlist.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  const shareUrl = shareCode ? setlistShareUrl(shareCode) : '';

  const buildShareText = (includeLink: boolean) => {
    if (!setlist) return '';
    let text = `📋 *${setlist.title}*\n\n`;
    songs.forEach((s, idx) => {
      text += `${idx + 1}. ${s.number ? `#${s.number} - ` : ''}${s.title}`;
      if (s.originalKey) text += ` (${s.originalKey})`;
      text += `\n`;
    });
    if (includeLink && shareUrl) {
      text += `\n🔗 ${shareUrl}\n`;
    }
    text += `\n✨ LouvorHub`;
    return text;
  };

  const copyLink = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(buildShareText(true))}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleShare = async () => {
    if (!setlist) return;

    const payload: ShareData = {
      title: setlist.title,
      text: buildShareText(false),
      url: shareUrl || undefined,
    };

    if (typeof navigator.share === 'function') {
      try {
        if (navigator.canShare && !navigator.canShare(payload)) {
          delete payload.url;
        }
        await navigator.share(payload);
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    setShowShareOptions(true);
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
      <header className="sticky top-0 z-20 bg-stone-950/95 backdrop-blur border-b border-stone-800/80">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm font-display font-bold text-emerald-300 light:text-emerald-700 hover:text-emerald-200 light:hover:text-emerald-800 shrink-0"
          >
            LouvorHub
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle compact />
            {setlist && setlist.visibility === 'public_link' && !error && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="p-2 rounded-button bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300"
                  title="Compartilhar"
                  aria-label="Compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="p-2 rounded-button bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300"
                  title="QR Code"
                  aria-label="Mostrar QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-sm text-rose-100 flex gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {setlist && setlist.visibility === 'public_link' && !error && (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-display font-bold text-stone-50 flex items-center gap-2">
                <ListMusic className="w-6 h-6 text-emerald-400 shrink-0" />
                {setlist.title}
              </h1>
              <p className="text-xs text-stone-500">{songs.length} música(s)</p>
            </div>

            {songs.length === 0 ? (
              <div className="text-center py-10 text-stone-500">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma música nesta playlist.</p>
              </div>
            ) : (
              <ol className="space-y-2">
                {songs.map((song, idx) => {
                  const open = expandedSongId === song.id;
                  return (
                    <li
                      key={song.id}
                      className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedSongId((prev) => {
                            const next = prev === song.id ? null : song.id;
                            setShowChords(false);
                            return next;
                          });
                        }}
                        className="w-full p-4 flex items-center gap-3 text-left hover:bg-stone-800/40 transition-colors"
                      >
                        <span className="w-7 h-7 rounded-lg bg-stone-800 light:bg-stone-100 text-emerald-300 light:text-emerald-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-bold text-stone-100 light:text-stone-900 truncate">
                            {song.number ? `#${song.number} · ` : ''}
                            {song.title}
                          </p>
                          <p className="text-xs text-stone-500 light:text-stone-500 mt-0.5 font-medium">
                            {song.originalKey ? `Tom ${song.originalKey}` : '—'}
                          </p>
                        </div>
                        {open ? (
                          <ChevronUp className="w-4 h-4 text-stone-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                        )}
                      </button>
                      {open && (
                        <div className="px-4 pb-4 border-t border-stone-800 pt-3 space-y-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openSongDialog(song.id)}
                              className="px-2.5 py-1.5 rounded-button text-[11px] font-semibold inline-flex items-center gap-1.5 border bg-stone-950 light:bg-stone-50 text-stone-300 light:text-stone-700 border-stone-700 light:border-stone-200 hover:border-emerald-500/50 hover:text-emerald-300 light:hover:text-emerald-700 transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              Abrir completo
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowChords((v) => !v)}
                              className={`px-2.5 py-1.5 rounded-button text-[11px] font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                                showChords
                                  ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                                  : 'bg-stone-950 light:bg-stone-50 text-stone-300 light:text-stone-700 border-stone-700 light:border-stone-200 hover:border-stone-500'
                              }`}
                            >
                              <Guitar className="w-3.5 h-3.5" />
                              {showChords ? 'Só letra' : 'Ver cifra'}
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {(song.lyrics || 'Sem letra.')
                              .split('\n')
                              .map((line, lineIdx) => {
                                const display = showChords ? line : stripChords(line);
                                return (
                                  <ChordLyricLine
                                    key={lineIdx}
                                    line={display}
                                    showChords={showChords}
                                    className="text-xs text-stone-300"
                                  />
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>

      {showShareOptions && setlist && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowShareOptions(false)}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-stone-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-share-dialog-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id="public-share-dialog-title"
                className="text-lg font-display font-bold text-emerald-100 light:text-stone-900 flex items-center gap-2"
              >
                <Share2 className="w-5 h-5 text-emerald-400 light:text-emerald-600" />
                Compartilhar
              </h3>
              <button
                type="button"
                onClick={() => setShowShareOptions(false)}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400 light:text-stone-500">
              Escolha como compartilhar{' '}
              <strong className="text-stone-200 light:text-stone-800">{setlist.title}</strong>
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  copyLink();
                  setShowShareOptions(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-xl text-sm font-semibold text-stone-200 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Link2 className="w-5 h-5 text-stone-400 shrink-0" />
                )}
                Copiar link
              </button>

              <button
                type="button"
                onClick={() => {
                  shareWhatsApp();
                  setShowShareOptions(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-xl text-sm font-semibold text-stone-200 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(buildShareText(true));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  setShowShareOptions(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-xl text-sm font-semibold text-stone-200 transition-colors"
              >
                <Copy className="w-5 h-5 text-stone-400 shrink-0" />
                Copiar texto
              </button>
            </div>
          </div>
        </div>
      )}

      {showQr && shareUrl && setlist && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-stone-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-qr-dialog-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id="public-qr-dialog-title"
                className="text-lg font-display font-bold text-emerald-100 light:text-stone-900 flex items-center gap-2"
              >
                <QrCode className="w-5 h-5 text-emerald-400 light:text-emerald-600" />
                QR Code
              </h3>
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400 light:text-stone-500">
              Escaneie para abrir{' '}
              <strong className="text-stone-200 light:text-stone-800">{setlist.title}</strong>
            </p>

            <div className="flex justify-center py-2">
              <ShareQrCode url={shareUrl} size={200} label="Aponte a câmera para abrir a playlist" />
            </div>

            <p className="text-[11px] text-stone-500 break-all text-center font-mono">{shareUrl}</p>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => copyLink()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                Copiar link
              </button>
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {(detailLoading || detailSong) && (
        <SongDetailModal
          song={detailSong}
          isLoading={detailLoading}
          onClose={() => {
            setDetailSong(null);
            setDetailLoading(false);
          }}
          isFavorite={false}
          onOpenProjection={(s) => setProjectionSongs([s])}
        />
      )}

      {projectionSongs && (
        <SongProjectionModal
          songsSequence={projectionSongs}
          onClose={() => setProjectionSongs(null)}
        />
      )}
    </div>
  );
};
