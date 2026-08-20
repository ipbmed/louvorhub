import React, { useEffect, useMemo, useState } from 'react';
import {
  Song,
  Setlist,
  SystemUser,
  PlaylistShare,
  SetlistVisibility,
  MAX_INDIVIDUAL_SETLISTS,
} from '../types';
import {
  ListMusic,
  Plus,
  Trash2,
  Tv,
  ArrowUp,
  ArrowDown,
  Calendar,
  Check,
  Music,
  Link2,
  Lock,
  Globe,
  Users,
  MessageCircle,
  X,
  Copy,
  Archive,
  ArchiveRestore,
  QrCode,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';
import { isGroupSetlist, setlistShareUrl } from '@/services/playlists';
import { ShareQrCode } from './ShareQrCode';

type SetlistTab = 'mine' | 'group' | 'all';

interface SetlistManagerProps {
  setlists: Setlist[];
  songs: Song[];
  systemUsers?: SystemUser[];
  currentUserId?: string;
  /** Grupos em que o usuário é integrante */
  memberGroupIds?: string[];
  onSaveSetlist: (setlist: Setlist) => void | Promise<void>;
  onDeleteSetlist: (id: string) => void;
  onArchiveSetlist?: (id: string, archived: boolean) => void | Promise<void>;
  onOpenProjectionPlaylist: (sequence: Song[]) => void;
  onSelectSong: (song: Song) => void;
}

export const SetlistManager: React.FC<SetlistManagerProps> = ({
  setlists,
  songs,
  systemUsers = [],
  currentUserId,
  memberGroupIds = [],
  onSaveSetlist,
  onDeleteSetlist,
  onArchiveSetlist,
  onOpenProjectionPlaylist,
  onSelectSong,
}) => {
  const [tab, setTab] = useState<SetlistTab>('mine');
  const [showArchivedGroups, setShowArchivedGroups] = useState(false);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newVisibility, setNewVisibility] = useState<SetlistVisibility>('private');
  const [copiedHint, setCopiedHint] = useState<'text' | 'link' | null>(null);
  const [showSharePeople, setShowSharePeople] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [shareDraft, setShareDraft] = useState<PlaylistShare[]>([]);
  const [pickUserId, setPickUserId] = useState('');
  const [pickPermission, setPickPermission] = useState<'view' | 'edit'>('view');
  const [createError, setCreateError] = useState<string | null>(null);

  const mySetlists = useMemo(
    () =>
      setlists.filter(
        (s) =>
          s.kind !== 'group_schedule' &&
          !s.groupId &&
          Boolean(currentUserId) &&
          s.createdBy === currentUserId,
      ),
    [setlists, currentUserId],
  );

  const groupSetlistsAll = useMemo(() => {
    const memberSet = new Set(memberGroupIds);
    if (!memberSet.size) return [];
    return setlists.filter(
      (s) => isGroupSetlist(s) && Boolean(s.groupId && memberSet.has(s.groupId)),
    );
  }, [setlists, memberGroupIds]);

  const groupSetlists = useMemo(
    () =>
      showArchivedGroups
        ? groupSetlistsAll
        : groupSetlistsAll.filter((s) => !s.archived),
    [groupSetlistsAll, showArchivedGroups],
  );

  // Menu Playlists: listas pessoais do usuário (repertório do culto vive no Evento)
  const visibleSetlists = mySetlists;

  const archivedGroupCount = useMemo(
    () => groupSetlistsAll.filter((s) => s.archived).length,
    [groupSetlistsAll],
  );

  const atIndividualLimit = mySetlists.length >= MAX_INDIVIDUAL_SETLISTS;

  useEffect(() => {
    if (!visibleSetlists.length) {
      setSelectedSetlistId('');
      return;
    }
    if (!visibleSetlists.some((s) => s.id === selectedSetlistId)) {
      setSelectedSetlistId(visibleSetlists[0].id);
    }
  }, [visibleSetlists, selectedSetlistId]);

  const activeSetlist =
    visibleSetlists.find((s) => s.id === selectedSetlistId) || visibleSetlists[0];
  const canEdit = activeSetlist?.canEdit !== false;

  const activeSongsInOrder: Song[] = activeSetlist
    ? activeSetlist.items
        .map((item) => songs.find((s) => s.id === item.songId))
        .filter((s): s is Song => Boolean(s))
    : [];

  const shareUrl = useMemo(
    () => (activeSetlist?.shareCode ? setlistShareUrl(activeSetlist.shareCode) : ''),
    [activeSetlist?.shareCode],
  );

  useEffect(() => {
    setShowQr(false);
  }, [activeSetlist?.id, activeSetlist?.visibility]);

  const flashCopied = (kind: 'text' | 'link') => {
    setCopiedHint(kind);
    setTimeout(() => setCopiedHint(null), 2000);
  };

  const handleCreateSetlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreateError(null);

    if (atIndividualLimit) {
      setCreateError(
        `Limite de ${MAX_INDIVIDUAL_SETLISTS} playlists atingido.`,
      );
      return;
    }

    const newSetlistObj: Setlist = {
      id: `temp-setlist-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      items: [],
      createdAt: new Date().toISOString(),
      kind: 'individual',
      visibility: newVisibility,
      shares: [],
      canEdit: true,
      createdBy: currentUserId,
      orgId: null,
      groupId: null,
    };

    void Promise.resolve(onSaveSetlist(newSetlistObj))
      .then(() => {
        setTab('mine');
        setNewTitle('');
        setNewVisibility('private');
        setShowCreateModal(false);
      })
      .catch((err: unknown) => {
        setCreateError((err as Error).message || 'Não foi possível criar a playlist.');
      });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!activeSetlist || !canEdit) return;
    const items = [...activeSetlist.items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    onSaveSetlist({ ...activeSetlist, items });
  };

  const handleRemoveItem = (songId: string) => {
    if (!activeSetlist || !canEdit) return;
    onSaveSetlist({
      ...activeSetlist,
      items: activeSetlist.items.filter((item) => item.songId !== songId),
    });
  };

  const handleToggleVisibility = () => {
    if (!activeSetlist || !canEdit) return;
    const next: SetlistVisibility =
      activeSetlist.visibility === 'public_link' ? 'private' : 'public_link';
    onSaveSetlist({ ...activeSetlist, visibility: next });
  };

  const buildShareText = (includeLink: boolean) => {
    if (!activeSetlist) return '';
    let text = `📋 *${activeSetlist.title}*\n📅 Data: ${activeSetlist.date}\n\n`;
    activeSongsInOrder.forEach((s, idx) => {
      text += `${idx + 1}. ${s.number ? `#${s.number} - ` : ''}${s.title}`;
      if (s.originalKey) text += ` (Tom: ${s.originalKey})`;
      text += `\n`;
    });
    if (includeLink && shareUrl && activeSetlist.visibility === 'public_link') {
      text += `\n🔗 Abrir playlist:\n${shareUrl}\n`;
    }
    text += `\n✨ LouvorHub`;
    return text;
  };

  const handleCopyText = () => {
    const text = buildShareText(true);
    if (!text) return;
    void navigator.clipboard.writeText(text);
    flashCopied('text');
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    flashCopied('link');
  };

  const handleWhatsApp = () => {
    const text = buildShareText(true);
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const openSharePeople = () => {
    if (!activeSetlist) return;
    setShareDraft(activeSetlist.shares ? [...activeSetlist.shares] : []);
    setPickUserId('');
    setPickPermission('view');
    setShowSharePeople(true);
  };

  const addPersonShare = () => {
    if (!pickUserId) return;
    if (shareDraft.some((s) => s.userId === pickUserId)) return;
    const user = systemUsers.find((u) => u.id === pickUserId);
    setShareDraft((prev) => [
      ...prev,
      { userId: pickUserId, permission: pickPermission, userName: user?.name },
    ]);
    setPickUserId('');
  };

  const savePeopleShares = () => {
    if (!activeSetlist) return;
    void Promise.resolve(onSaveSetlist({ ...activeSetlist, shares: shareDraft })).then(() =>
      setShowSharePeople(false),
    );
  };

  const availableUsers = systemUsers.filter(
    (u) => u.id !== activeSetlist?.createdBy && !shareDraft.some((s) => s.userId === u.id),
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <PageHeader
        icon={ListMusic}
        title="Playlists"
        description="Suas listas pessoais. O repertório do culto fica dentro de cada Evento."
        actions={
          <PageHeaderButton
            icon={Plus}
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            disabled={atIndividualLimit}
            className={atIndividualLimit ? 'opacity-50 cursor-not-allowed' : undefined}
            title={
              atIndividualLimit
                ? `Limite de ${MAX_INDIVIDUAL_SETLISTS} playlists`
                : 'Criar playlist'
            }
          >
            Adicionar
          </PageHeaderButton>
        }
      />

      <p className="text-[11px] text-stone-500">
        Minhas playlists · {mySetlists.length}/{MAX_INDIVIDUAL_SETLISTS}
        {atIndividualLimit ? ' · limite atingido' : ''}
      </p>

      {visibleSetlists.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {visibleSetlists.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSetlistId(s.id)}
              className={`px-4 py-2.5 rounded-button text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedSetlistId === s.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                  : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{s.title}</span>
              {isGroupSetlist(s) && (
                <span className="text-[10px] text-teal-300">Grupo</span>
              )}
              {s.archived && (
                <span className="text-[10px] text-amber-300/90">Arquivado</span>
              )}
              <span className="px-1.5 py-0.2 bg-stone-800 text-stone-400 rounded-full text-[10px] font-mono">
                {s.items.length}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-stone-900/50 border border-stone-800 rounded-3xl p-8 text-center text-stone-400 space-y-3">
          <ListMusic className="w-10 h-10 text-stone-600 mx-auto" />
          <p className="font-display text-lg text-stone-300">
            Nenhuma playlist sua ainda.
          </p>
          <p className="text-xs">
            Crie até {MAX_INDIVIDUAL_SETLISTS} playlists pessoais.
          </p>
        </div>
      )}

      {activeSetlist && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-800 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  {activeSetlist.date}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-button border text-[10px] font-bold ${
                    activeSetlist.visibility === 'public_link'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      : 'bg-stone-950 text-stone-400 border-stone-700'
                  }`}
                >
                  {activeSetlist.visibility === 'public_link' ? (
                    <>
                      <Globe className="w-3 h-3" /> Público
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" /> Privado
                    </>
                  )}
                </span>
                {isGroupSetlist(activeSetlist) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-button border text-[10px] font-bold bg-teal-950/50 text-teal-300 border-teal-800">
                    {activeSetlist.kind === 'group_schedule' ? 'Da escala' : 'Grupo'}
                  </span>
                )}
                {activeSetlist.archived && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-button border text-[10px] font-bold bg-amber-950/50 text-amber-300 border-amber-800">
                    <Archive className="w-3 h-3" />
                    Arquivado
                  </span>
                )}
              </div>
              <h3 className="text-xl font-display font-bold text-stone-100">{activeSetlist.title}</h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeSongsInOrder.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenProjectionPlaylist(activeSongsInOrder)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs flex items-center gap-1.5"
                >
                  <Tv className="w-4 h-4" />
                  Projeção
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button border border-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
                  title="Alternar público/privado"
                >
                  {activeSetlist.visibility === 'public_link' ? (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {activeSetlist.visibility === 'public_link' ? 'Público' : 'Privado'}
                  </span>
                </button>
              )}

              {canEdit && !isGroupSetlist(activeSetlist) && (
                <button
                  type="button"
                  onClick={openSharePeople}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button border border-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Pessoas</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!shareUrl}
                className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 rounded-button border border-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
                title="Copiar link"
              >
                {copiedHint === 'link' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Link</span>
              </button>

              {activeSetlist.visibility === 'public_link' && shareUrl && (
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  className={`p-2 rounded-button border text-xs font-semibold inline-flex items-center gap-1.5 ${
                    showQr
                      ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                  }`}
                  title="Mostrar QR Code"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">QR</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleWhatsApp}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button border border-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button border border-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {copiedHint === 'text' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Texto</span>
              </button>

              {canEdit && isGroupSetlist(activeSetlist) && onArchiveSetlist && (
                <button
                  type="button"
                  onClick={() =>
                    void onArchiveSetlist(activeSetlist.id, !activeSetlist.archived)
                  }
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button border border-stone-700 text-xs font-semibold inline-flex items-center gap-1.5"
                  title={activeSetlist.archived ? 'Desarquivar' : 'Arquivar'}
                >
                  {activeSetlist.archived ? (
                    <ArchiveRestore className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Archive className="w-4 h-4 text-amber-300" />
                  )}
                  <span className="hidden sm:inline">
                    {activeSetlist.archived ? 'Desarquivar' : 'Arquivar'}
                  </span>
                </button>
              )}

              {canEdit && !isGroupSetlist(activeSetlist) && (
                <button
                  type="button"
                  onClick={() => onDeleteSetlist(activeSetlist.id)}
                  className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-button border border-rose-800/40"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {activeSetlist.visibility === 'public_link' && shareUrl && (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-500 break-all">
                Link público: <span className="text-emerald-300/90 font-mono">{shareUrl}</span>
              </p>
              {showQr && (
                <div className="flex justify-center sm:justify-start">
                  <ShareQrCode url={shareUrl} size={168} />
                </div>
              )}
            </div>
          )}
          {activeSetlist.visibility !== 'public_link' && (
            <p className="text-[11px] text-stone-500">
              Playlist privada — o link só funciona para quem tem acesso (criador ou pessoas
              compartilhadas). Torne pública para compartilhar com qualquer pessoa.
            </p>
          )}

          {activeSongsInOrder.length > 0 ? (
            <div className="space-y-3">
              {activeSongsInOrder.map((song, idx) => (
                <div
                  key={song.id}
                  className="bg-stone-950 border border-stone-800/80 hover:border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-stone-800 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-mono font-bold text-emerald-300 text-sm flex items-center justify-center shrink-0">
                      {song.number ? `#${song.number}` : '·'}
                    </div>
                    <div className="min-w-0">
                      <h4
                        onClick={() => onSelectSong(song)}
                        className="text-base font-display font-bold text-stone-100 hover:text-emerald-200 cursor-pointer truncate"
                      >
                        {song.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                        <span>
                          Tom: <strong>{song.originalKey || 'C'}</strong>
                        </span>
                        <span>·</span>
                        <span>{song.category}</span>
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 bg-stone-900 text-stone-400 hover:text-stone-100 disabled:opacity-20 rounded-button"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, 'down')}
                        disabled={idx === activeSongsInOrder.length - 1}
                        className="p-1.5 bg-stone-900 text-stone-400 hover:text-stone-100 disabled:opacity-20 rounded-button"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(song.id)}
                        className="p-1.5 bg-stone-900 text-rose-400 hover:bg-rose-950/60 rounded-button ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-400 space-y-2">
              <Music className="w-8 h-8 text-stone-600 mx-auto" />
              <p className="text-sm">Nenhuma música nesta playlist.</p>
              <p className="text-xs text-stone-500">
                Adicione músicas pela lista principal.
              </p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-stone-100">
            <h3 className="text-xl font-display font-bold text-emerald-100 mb-4">
              Criar playlist
            </h3>
            <p className="text-[11px] text-stone-500 -mt-2 mb-4">
              Limite: {mySetlists.length}/{MAX_INDIVIDUAL_SETLISTS} por usuário
            </p>
            {createError && (
              <p className="text-xs text-rose-300 mb-3 bg-rose-950/40 border border-rose-800/40 rounded-xl px-3 py-2">
                {createError}
              </p>
            )}
            <form onSubmit={handleCreateSetlist} className="space-y-4 text-sm">
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Ensaio de sábado"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Data</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-2">Visibilidade</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVisibility('private')}
                    className={`flex-1 px-3 py-2 rounded-button text-xs font-semibold border inline-flex items-center justify-center gap-1.5 ${
                      newVisibility === 'private'
                        ? 'bg-stone-800 text-stone-100 border-stone-600'
                        : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Privado
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVisibility('public_link')}
                    className={`flex-1 px-3 py-2 rounded-button text-xs font-semibold border inline-flex items-center justify-center gap-1.5 ${
                      newVisibility === 'public_link'
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-600'
                        : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> Público
                  </button>
                </div>
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-button font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 text-stone-950 font-bold rounded-button"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSharePeople && activeSetlist && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-stone-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-emerald-100 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Compartilhar com pessoas
              </h3>
              <button
                type="button"
                onClick={() => setShowSharePeople(false)}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Conceda acesso para visualizar ou editar. Para quem não tem conta, use o link público.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={pickUserId}
                onChange={(e) => setPickUserId(e.target.value)}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs"
              >
                <option value="">Selecionar usuário…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                value={pickPermission}
                onChange={(e) => setPickPermission(e.target.value as 'view' | 'edit')}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs"
              >
                <option value="view">Visualizar</option>
                <option value="edit">Editar</option>
              </select>
              <button
                type="button"
                onClick={addPersonShare}
                disabled={!pickUserId}
                className="px-3 py-2 bg-emerald-500 disabled:opacity-40 text-stone-950 font-bold rounded-button text-xs"
              >
                Adicionar
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shareDraft.length === 0 ? (
                <p className="text-xs text-stone-500">Nenhuma pessoa compartilhada.</p>
              ) : (
                shareDraft.map((s) => (
                  <div
                    key={s.userId}
                    className="flex items-center justify-between gap-2 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-stone-200">
                      {s.userName || systemUsers.find((u) => u.id === s.userId)?.name || s.userId}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={s.permission}
                        onChange={(e) =>
                          setShareDraft((prev) =>
                            prev.map((x) =>
                              x.userId === s.userId
                                ? { ...x, permission: e.target.value as 'view' | 'edit' }
                                : x,
                            ),
                          )
                        }
                        className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1"
                      >
                        <option value="view">Ver</option>
                        <option value="edit">Editar</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setShareDraft((prev) => prev.filter((x) => x.userId !== s.userId))
                        }
                        className="text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowSharePeople(false)}
                className="px-4 py-2 bg-stone-800 text-stone-300 rounded-button text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={savePeopleShares}
                className="px-5 py-2 bg-emerald-500 text-stone-950 font-bold rounded-button text-xs"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
