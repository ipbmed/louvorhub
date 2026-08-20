import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Guitar,
  ListMusic,
  Loader2,
  Lock,
  Maximize2,
  MessageCircle,
  Music,
  QrCode,
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

  const buildText = () => {
    if (!setlist) return '';
    let text = `📋 *${setlist.title}*\n\n`;
    songs.forEach((s, idx) => {
      text += `${idx + 1}. ${s.number ? `#${s.number} - ` : ''}${s.title}`;
      if (s.originalKey) text += ` (${s.originalKey})`;
      text += `\n`;
    });
    text += `\n🔗 ${shareUrl}\n\n✨ LouvorHub`;
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
      `https://wa.me/?text=${encodeURIComponent(buildText())}`,
      '_blank',
      'noopener,noreferrer',
    );
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
            className="text-sm font-display font-bold text-emerald-300 hover:text-emerald-200 shrink-0"
          >
            LouvorHub
          </Link>
          {setlist && setlist.visibility === 'public_link' && !error && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={copyLink}
                className="p-2 rounded-button bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300"
                title="Copiar link"
                aria-label="Copiar link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="p-2 rounded-button bg-stone-900 hover:bg-stone-800 border border-stone-700 text-emerald-400"
                title="WhatsApp"
                aria-label="Compartilhar no WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className={`p-2 rounded-button border ${
                  showQr
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
                }`}
                title="QR Code"
                aria-label="Mostrar QR Code"
                aria-pressed={showQr}
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          )}
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

            {showQr && shareUrl && (
              <div className="flex justify-center">
                <ShareQrCode url={shareUrl} size={180} />
              </div>
            )}

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
                        <span className="w-7 h-7 rounded-lg bg-stone-800 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-bold text-stone-100 truncate">
                            {song.number ? `#${song.number} · ` : ''}
                            {song.title}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5">
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
                              className="px-2.5 py-1.5 rounded-button text-[11px] font-semibold inline-flex items-center gap-1.5 border bg-stone-950 text-stone-300 border-stone-700 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
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
                                  : 'bg-stone-950 text-stone-300 border-stone-700 hover:border-stone-500'
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
