import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Category,
  Church,
  ChurchEvent,
  Liturgy,
  MusicGroup,
  ScheduleSongCustomization,
  Setlist,
  Song,
  SystemUser,
  ViewMode,
  WorshipSchedule,
} from './types';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastProvider';
import { useOrg } from '@/hooks/useOrg';
import { usePermissions } from '@/hooks/usePermissions';
import * as songsService from '@/services/songs';
import * as categoriesService from '@/services/categories';
import * as favoritesService from '@/services/favorites';
import * as orgsService from '@/services/organizations';
import * as musicGroupsService from '@/services/musicGroups';
import * as membersService from '@/services/members';
import * as playlistsService from '@/services/playlists';
import * as eventSongsService from '@/services/eventSongs';
import * as schedulesService from '@/services/schedules';
import * as liturgiesService from '@/services/liturgies';
import * as eventsService from '@/services/events';
import { downloadJsonBackup } from '@/utils/exportBackup';
import { songPath, songVersionPath } from '@/utils/songRoutes';

import { Header } from './components/Header';
import { SongCard } from './components/SongCard';
import { SongListRow } from './components/SongListRow';
import { SongDetailModal } from './components/SongDetailModal';
import { SongProjectionModal } from './components/SongProjectionModal';
import { NumericKeypadModal } from './components/NumericKeypadModal';
import { AdvancedSearchModal, SearchFilters } from './components/AdvancedSearchModal';
import { SetlistManager } from './components/SetlistManager';
import { AddToSetlistModal } from './components/AddToSetlistModal';
import { PublicSetlistPage } from './components/PublicSetlistPage';
import { PublicEventPage } from './components/PublicEventPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SongFormModal } from './components/SongFormModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { TagManagerModal } from './components/TagManagerModal';
import { ChurchManager } from './components/ChurchManager';
import { EventManager } from './components/EventManager';
import { EventDetail } from './components/EventDetail';
import { UserManager } from './components/UserManager';
import { AlphabetFilter } from './components/AlphabetFilter';
import { AppSidebar } from './components/AppSidebar';
import { ProfilePage } from './components/ProfilePage';
import { Music, ArrowUpDown, AlertCircle, LayoutGrid, List, Loader2 } from 'lucide-react';

type SongsLayoutMode = 'cards' | 'list';
const SONGS_LAYOUT_KEY = 'louvorhub_songs_layout';

const INITIAL_FILTERS: SearchFilters = {
  keyword: '',
  songType: 'all',
  hymnal: '',
  minNumber: '',
  maxNumber: '',
  category: '',
  key: '',
  author: '',
  hasChordsOnly: false,
};

export default function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const songVersionMatch = useMatch('/musica/versao/:eventSongId');
  const songMatch = useMatch('/musica/:songId');
  const playlistShareMatch = useMatch('/playlist/:shareCode');
  const legacyPlaylistShareMatch = useMatch('/repertorio/:shareCode');
  const eventShareMatch = useMatch('/evento/:shareCode');
  const selectedEventSongId = songVersionMatch?.params.eventSongId ?? null;
  const selectedSongId = selectedEventSongId
    ? null
    : (songMatch?.params.songId ?? null);
  const playlistShareCode =
    playlistShareMatch?.params.shareCode ??
    legacyPlaylistShareMatch?.params.shareCode ??
    null;
  const eventShareCode = eventShareMatch?.params.shareCode ?? null;
  const { ready, user, profile, signOut, configured, refreshMemberships, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { orgId, memberships, setActiveOrgId, activeOrgId } = useOrg();
  const {
    isAdmin,
    canAccessAdminPanel,
    canManageUsers,
    canManageSongs,
    canManageSchedules,
    canManageChurches,
    canAccessLiturgies,
    canAccessEvents,
    canEditChurch,
    canEditGroup,
    churchEditorOrgIds,
    groupEditorGroupIds,
    refreshGrants,
  } = usePermissions();

  const [currentView, setCurrentView] = useState<ViewMode>('public');
  const [activeCategoryPill, setActiveCategoryPill] = useState('Todos');
  const [selectedLetter, setSelectedLetter] = useState('TODAS');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'title' | 'recent'>('number');
  const [songsLayout, setSongsLayout] = useState<SongsLayoutMode>(() => {
    try {
      const saved = localStorage.getItem(SONGS_LAYOUT_KEY);
      return saved === 'list' ? 'list' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>(INITIAL_FILTERS);

  const handleSongsLayoutChange = (mode: SongsLayoutMode) => {
    setSongsLayout(mode);
    try {
      localStorage.setItem(SONGS_LAYOUT_KEY, mode);
    } catch {
      /* ignore */
    }
  };
  const [projectionSongs, setProjectionSongs] = useState<Song[] | null>(null);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [songToEdit, setSongToEdit] = useState<Song | null | 'new'>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [sidebarDesktopOpen, setSidebarDesktopOpen] = useState(() => {
    try {
      return localStorage.getItem('louvorhub_sidebar_desktop') !== '0';
    } catch {
      return true;
    }
  });
  const [songToAddToSetlist, setSongToAddToSetlist] = useState<Song | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const setSidebarDesktop = (open: boolean) => {
    setSidebarDesktopOpen(open);
    try {
      localStorage.setItem('louvorhub_sidebar_desktop', open ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const isEventDetail =
    currentView === 'events' && Boolean(selectedEventId);

  const PROTECTED_VIEWS: ViewMode[] = [
    'setlist',
    'churches',
    'users',
    'events',
    'schedules',
    'liturgies',
    'admin',
    'profile',
  ];

  const handleViewChange = (view: ViewMode) => {
    if (!user && PROTECTED_VIEWS.includes(view)) {
      setShowLogin(true);
      showToast('Entre para acessar esta área.');
      return;
    }
    if (user) {
      if (view === 'admin' && !canAccessAdminPanel) {
        showToast('Somente administradores acessam o Painel Geral.');
        return;
      }
      if (view === 'users' && !canManageUsers) {
        showToast('Somente administradores gerenciam usuários.');
        return;
      }
      if (view === 'churches' && !canManageChurches) {
        showToast('Sem permissão para gerenciar igrejas e grupos.');
        return;
      }
      if (view === 'events' && !canAccessEvents) {
        showToast('Sem permissão para acessar eventos.');
        return;
      }
    }
    if (view !== 'events') setSelectedEventId(null);
    setCurrentView(view);
  };

  // Visitante: somente consulta de músicas
  useEffect(() => {
    if (!user && PROTECTED_VIEWS.includes(currentView)) {
      setCurrentView('public');
    }
    if (!user) {
      setSongToEdit(null);
      setShowCategoryManager(false);
      setShowFavoritesOnly(false);
    }
  }, [user, currentView]);

  const orgIds = useMemo(
    () => memberships.map((m) => m.org_id).filter(Boolean),
    [memberships],
  );

  const songsQuery = useQuery({
    queryKey: ['songs', orgId ?? 'public'],
    enabled: Boolean(configured),
    queryFn: () => songsService.listSongs(orgId, true),
  });

  const selectedSongQuery = useQuery({
    queryKey: ['song', selectedSongId],
    enabled: Boolean(configured && selectedSongId),
    queryFn: async () => {
      const song = await songsService.getSong(selectedSongId!);
      if (!song) throw new Error('Música não encontrada');
      return song;
    },
  });

  const selectedSongVersionQuery = useQuery({
    queryKey: ['song-version', selectedEventSongId],
    enabled: Boolean(configured && selectedEventSongId),
    queryFn: () => eventSongsService.getSongForVersion(selectedEventSongId!),
  });

  const openSong = (song: Song, options?: { eventSongId?: string }) => {
    if (options?.eventSongId) {
      navigate(songVersionPath(options.eventSongId), { state: { fromApp: true } });
      return;
    }
    navigate(songPath(song), { state: { fromApp: true } });
  };

  const closeSongPage = () => {
    if ((location.state as { fromApp?: boolean } | null)?.fromApp) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const categoriesQuery = useQuery({
    queryKey: ['categories', orgId],
    enabled: Boolean(configured && orgId),
    queryFn: () => categoriesService.listCategories(orgId!),
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites', user?.id],
    enabled: Boolean(configured && user?.id),
    queryFn: () => favoritesService.listFavoriteSongIds(user!.id),
  });

  const churchesQuery = useQuery({
    queryKey: ['churches', user?.id],
    enabled: Boolean(configured && user?.id),
    queryFn: () => orgsService.listOrganizationsForUser(user!.id),
  });

  const musicGroupsQuery = useQuery({
    queryKey: ['musicGroups', orgIds.join(',')],
    enabled: Boolean(configured && orgIds.length),
    queryFn: () => musicGroupsService.listMusicGroupsForOrgs(orgIds),
  });

  const membersQuery = useQuery({
    queryKey: ['members', orgId],
    enabled: Boolean(configured && orgId),
    queryFn: () => membersService.listOrgMembers(orgId!),
  });

  const setlistsQuery = useQuery({
    queryKey: ['setlists', user?.id],
    enabled: Boolean(configured && user?.id),
    queryFn: () => playlistsService.listSetlists(user!.id),
  });

  const eventsQuery = useQuery({
    queryKey: ['events', orgId],
    enabled: Boolean(configured && orgId && canAccessEvents),
    queryFn: () => eventsService.listEvents(orgId!),
  });

  const eventBundleQuery = useQuery({
    queryKey: ['event-bundle', selectedEventId],
    enabled: Boolean(configured && selectedEventId),
    queryFn: () => eventsService.getEventBundle(selectedEventId!),
  });

  const songs = songsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const favorites = favoritesQuery.data || [];
  const churches = churchesQuery.data || [];
  const musicGroups = musicGroupsQuery.data || [];
  const systemUsers = membersQuery.data || [];
  const setlists = setlistsQuery.data || [];
  const events = eventsQuery.data || [];
  const eventBundle = eventBundleQuery.data || null;
  const selectedSong = selectedEventSongId
    ? (selectedSongVersionQuery.data?.song ?? null)
    : (selectedSongQuery.data ?? null);
  const songEventVersion = selectedEventSongId
    ? selectedSongVersionQuery.data?.event ?? null
    : null;
  const activeSongRouteId = selectedEventSongId || selectedSongId;
  const catalogSongId = selectedSong?.id ?? selectedSongId;

  useEffect(() => {
    if (selectedSong) {
      document.title = selectedEventSongId
        ? `${selectedSong.title} (versão) · LouvorHub`
        : `${selectedSong.title} · LouvorHub`;
      return () => {
        document.title = 'LouvorHub';
      };
    }
    if (!activeSongRouteId) document.title = 'LouvorHub';
  }, [selectedSong, selectedEventSongId, activeSongRouteId]);
  const activeChurchGroups = useMemo(
    () => (orgId ? musicGroups.filter((g) => g.churchId === orgId) : []),
    [musicGroups, orgId],
  );

  const invalidateAll = async () => {
    await queryClient.invalidateQueries();
  };

  const saveSongMutation = useMutation({
    mutationFn: (song: Song) => {
      if (!orgId) throw new Error('Selecione uma igreja');
      return songsService.upsertSong(orgId, song);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['song', saved.id], saved);
      queryClient.setQueriesData<Song[]>({ queryKey: ['songs'] }, (prev) =>
        prev ? prev.map((s) => (s.id === saved.id ? saved : s)) : prev,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['songs'] }),
        queryClient.invalidateQueries({ queryKey: ['song', saved.id] }),
        queryClient.invalidateQueries({ queryKey: ['song-version'] }),
      ]);
      const label = saved.number ? `Hino #${saved.number}` : `Cântico "${saved.title}"`;
      showToast(`${label} salvo!`);
      setSongToEdit(null);
    },
    onError: (err: Error) => showToast(err.message || 'Erro ao salvar música'),
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id: string) => songsService.deleteSong(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['songs'] });
      showToast('Música excluída.');
    },
    onError: (err: Error) => showToast(err.message),
  });

  const requireOrg = () => {
    if (!orgId) {
      showToast('Selecione ou entre em uma igreja primeiro.');
      return false;
    }
    return true;
  };

  const handleSaveSong = async (song: Song) => {
    if (!requireOrg()) throw new Error('Selecione uma igreja');
    const category = categories.find((c) => c.name === song.category || c.id === song.categoryId);
    return saveSongMutation.mutateAsync({
      ...song,
      categoryId: category?.id || song.categoryId,
      category: category?.name || song.category,
      // Sempre enviar array (mesmo vazio) para o serviço não usar fallback legado
      mediaLinks: song.mediaLinks ?? [],
      youtubeUrl: song.youtubeUrl,
      spotifyUrl: song.spotifyUrl,
      otherMediaUrl: song.otherMediaUrl,
    });
  };

  const handleDeleteSong = (song: Song) => {
    const label = song.number ? `hino #${song.number}` : `cântico "${song.title}"`;
    if (confirm(`Tem certeza que deseja excluir o ${label}?`)) {
      deleteSongMutation.mutate(song.id);
    }
  };

  const handleSaveCategories = async (updated: Category[]) => {
    if (!requireOrg()) return;
    try {
      await categoriesService.replaceCategories(orgId!, updated);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categorias atualizadas!');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveSetlist = async (setlist: Setlist) => {
    if (!user) {
      showToast('Faça login para salvar a playlist.');
      return;
    }
    try {
      await playlistsService.upsertSetlist(user.id, {
        ...setlist,
        kind: 'individual',
        eventId: null,
        orgId: null,
        groupId: null,
      });
      await queryClient.invalidateQueries({ queryKey: ['setlists'] });
      showToast(`Playlist "${setlist.title}" salva!`);
    } catch (err) {
      showToast((err as Error).message);
      throw err;
    }
  };

  const handleDeleteSetlist = async (id: string) => {
    try {
      await playlistsService.deleteSetlist(id);
      await queryClient.invalidateQueries({ queryKey: ['setlists'] });
      showToast('Playlist excluída.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleArchiveSetlist = async (id: string, archived: boolean) => {
    try {
      await playlistsService.setSetlistArchived(id, archived);
      await queryClient.invalidateQueries({ queryKey: ['setlists'] });
      showToast(archived ? 'Playlist arquivada.' : 'Playlist desarquivada.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveChurch = async (church: Church) => {
    if (!user) {
      showToast('Faça login para gerenciar igrejas.');
      return;
    }
    try {
      if (church.id && !church.id.startsWith('temp-') && churches.some((c) => c.id === church.id)) {
        await orgsService.updateOrganization(church);
      } else {
        const created = await orgsService.createOrganization(user.id, church);
        setActiveOrgId(created.id);
      }
      await refreshMemberships();
      await queryClient.invalidateQueries({ queryKey: ['churches'] });
      showToast(`Igreja "${church.name}" salva!`);
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleDeleteChurch = async (id: string) => {
    if (!confirm('Remover esta igreja? Esta ação é irreversível.')) return;
    try {
      await orgsService.deleteOrganization(id);
      await refreshMemberships();
      await invalidateAll();
      showToast('Igreja removida.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveMusicGroup = async (group: MusicGroup) => {
    try {
      await musicGroupsService.upsertMusicGroup(group);
      await queryClient.invalidateQueries({ queryKey: ['musicGroups'] });
      showToast(`Grupo "${group.name}" salvo!`);
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleDeleteMusicGroup = async (id: string) => {
    try {
      await musicGroupsService.deleteMusicGroup(id);
      await queryClient.invalidateQueries({ queryKey: ['musicGroups'] });
      showToast('Grupo de louvor removido.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const invalidateEvents = async () => {
    await queryClient.invalidateQueries({ queryKey: ['events'] });
    await queryClient.invalidateQueries({ queryKey: ['event-bundle'] });
    await queryClient.invalidateQueries({ queryKey: ['song-version'] });
  };

  const handleSaveEvent = async (event: ChurchEvent) => {
    if (!requireOrg()) return;
    try {
      await eventsService.upsertEvent(user?.id, { ...event, churchId: orgId! });
      await invalidateEvents();
      showToast('Evento salvo!');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveEventBatch = async (
    event: ChurchEvent,
    count: number,
    intervalDays: number,
  ) => {
    if (!requireOrg()) return;
    try {
      const created = await eventsService.upsertEventBatch(
        user?.id,
        { ...event, churchId: orgId! },
        count,
        intervalDays,
      );
      await invalidateEvents();
      showToast(`${created.length} eventos criados!`);
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await eventsService.deleteEvent(id);
      if (selectedEventId === id) setSelectedEventId(null);
      await invalidateEvents();
      showToast('Evento removido.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveSchedule = async (schedule: WorshipSchedule | WorshipSchedule[]) => {
    try {
      const list = Array.isArray(schedule) ? schedule : [schedule];
      for (const item of list) {
        await schedulesService.upsertSchedule(user?.id, {
          ...item,
          eventId: item.eventId || selectedEventId || undefined,
        });
      }
      await invalidateEvents();
      showToast(
        list.length > 1
          ? `${list.length} escalas salvas!`
          : 'Equipe de louvor salva!',
      );
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await schedulesService.deleteSchedule(id);
      await invalidateEvents();
      showToast('Escala removida.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveLiturgy = async (liturgy: Liturgy) => {
    try {
      await liturgiesService.upsertLiturgy(user?.id, {
        ...liturgy,
        eventId: liturgy.eventId || selectedEventId || undefined,
      });
      await invalidateEvents();
      showToast('Liturgia salva!');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleDeleteLiturgy = async (id: string) => {
    try {
      await liturgiesService.deleteLiturgy(id);
      await invalidateEvents();
      showToast('Liturgia removida.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleEnsureEventLiturgy = async () => {
    if (!selectedEventId || !eventBundle?.event) return;
    try {
      await eventsService.ensureEventLiturgy(user?.id, eventBundle.event);
      await invalidateEvents();
      showToast('Liturgia criada para o evento.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveEventSetlist = async (setlist: Setlist) => {
    if (!requireOrg()) return;
    const eventId = selectedEventId || setlist.eventId;
    if (!eventId) {
      showToast('Evento não encontrado.');
      return;
    }
    try {
      await eventSongsService.upsertEventRepertoireFromSetlist({
        ...setlist,
        orgId: orgId!,
        eventId,
        kind: 'group_schedule',
      });
      await invalidateEvents();
      showToast('Repertório do evento atualizado!');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveEventSongVersion = async (customization: ScheduleSongCustomization) => {
    const eventId = selectedEventId || eventBundle?.event?.id;
    if (!eventId) {
      showToast('Evento não encontrado.');
      return;
    }
    try {
      await eventSongsService.upsertEventSongVersion({
        eventId,
        customization,
      });
      await invalidateEvents();
      showToast('Versão do evento salva!');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleResetEventSongVersion = async (songId: string) => {
    const eventId = selectedEventId || eventBundle?.event?.id;
    if (!eventId) return;
    try {
      await eventSongsService.resetEventSongVersion(eventId, songId);
      await invalidateEvents();
      showToast('Versão do evento removida. Catálogo restaurado.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleSaveUser = async (member: SystemUser) => {
    if (!requireOrg()) return;
    const isNew = !member.id || member.id.startsWith('temp-') || !member.membershipId;
    try {
      await membersService.upsertSystemUserAsProfile(orgId!, member);
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast(
        isNew
          ? `Usuário "${member.name}" cadastrado!`
          : `Usuário "${member.name}" atualizado!`,
      );
    } catch (err) {
      const message = (err as Error).message || 'Não foi possível salvar o usuário.';
      showToast(message);
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    const member = systemUsers.find((u) => u.id === id);
    if (!member?.membershipId) {
      showToast('Membership não encontrado.');
      return;
    }
    try {
      await membersService.removeMembership(member.membershipId);
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Membro removido da igreja.');
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleToggleFavorite = async (songId: string) => {
    if (!user) {
      setShowLogin(true);
      showToast('Entre para salvar favoritos.');
      return;
    }
    try {
      const next = await favoritesService.toggleFavorite(user.id, songId);
      queryClient.setQueryData(['favorites', user.id], next);
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleAddToSetlist = (song: Song) => {
    if (!user) {
      showToast('Faça login para adicionar à playlist.');
      return;
    }
    setSongToAddToSetlist(song);
  };

  const handleConfirmAddToSetlist = async (setlist: Setlist) => {
    if (!songToAddToSetlist || !user) return;
    const song = songToAddToSetlist;
    const name = song.number ? `Hino #${song.number}` : `Cântico "${song.title}"`;
    if (setlist.items.some((i) => i.songId === song.id)) {
      throw new Error(`${name} já está nesta playlist.`);
    }
    await playlistsService.upsertSetlist(user.id, {
      ...setlist,
      orgId: null,
      groupId: null,
      items: [...setlist.items, { id: `item-${Date.now()}`, songId: song.id }],
    });
    await queryClient.invalidateQueries({ queryKey: ['setlists'] });
    showToast(`${name} adicionado a "${setlist.title}"!`);
  };

  const handleImportJSON = async (file: File) => {
    if (!requireOrg()) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data.categories)) {
          await categoriesService.replaceCategories(orgId!, data.categories);
        }
        if (Array.isArray(data.songs)) {
          await songsService.importSongsBulk(orgId!, data.songs);
        }
        await invalidateAll();
        showToast('Dados importados no Supabase!');
      } catch {
        alert('Formato de arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleJoinOrg = async () => {
    if (!user || !joinCode.trim()) return;
    try {
      const church = await orgsService.joinOrganizationByInvite(user.id, joinCode.trim());
      setActiveOrgId(church.id);
      await refreshMemberships();
      await invalidateAll();
      setJoinCode('');
      showToast(`Entrou em "${church.name}"!`);
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const filteredSongs = songs.filter((h) => {
    if (showFavoritesOnly && !favorites.includes(h.id)) return false;
    if (activeCategoryPill !== 'Todos' && h.category !== activeCategoryPill) return false;
    if (selectedLetter !== 'TODAS') {
      const first = (h.title || '').trim().charAt(0).toUpperCase();
      if (first !== selectedLetter) return false;
    }
    const q = quickQuery.trim().toLowerCase();
    if (q) {
      const numMatch = h.number != null && String(h.number) === q;
      const textMatch =
        h.title.toLowerCase().includes(q) ||
        (h.lyrics || '').toLowerCase().includes(q) ||
        (h.author || '').toLowerCase().includes(q);
      if (!numMatch && !textMatch) return false;
    }
    const f = advancedFilters;
    if (f.songType !== 'all' && (h.songType || (h.number ? 'hino' : 'cantico')) !== f.songType) return false;
    if (f.hymnal && !(h.hymnal || '').toLowerCase().includes(f.hymnal.toLowerCase())) return false;
    if (f.category && h.category !== f.category) return false;
    if (f.key && (h.originalKey || '') !== f.key) return false;
    if (f.author && !(h.author || '').toLowerCase().includes(f.author.toLowerCase())) return false;
    if (f.hasChordsOnly && !/\[[A-G]/.test(h.lyrics || '')) return false;
    if (f.minNumber && (h.number == null || h.number < Number(f.minNumber))) return false;
    if (f.maxNumber && (h.number == null || h.number > Number(f.maxNumber))) return false;
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      const hit =
        h.title.toLowerCase().includes(kw) ||
        (h.lyrics || '').toLowerCase().includes(kw) ||
        (h.tags || []).some((t) => t.toLowerCase().includes(kw));
      if (!hit) return false;
    }
    return true;
  });

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'pt-BR');
    if (sortBy === 'recent') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    const an = a.number ?? 9999;
    const bn = b.number ?? 9999;
    return an - bn || a.title.localeCompare(b.title, 'pt-BR');
  });

  const orgOptions = memberships
    .filter((m) => m.organizations && !m.organizations.is_global)
    .map((m) => ({ id: m.org_id, name: m.organizations!.name }));

  if (eventShareCode) {
    return <PublicEventPage shareCode={eventShareCode} />;
  }

  if (playlistShareCode) {
    return <PublicSetlistPage shareCode={playlistShareCode} />;
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {!songMatch && (
        <Header
          currentView={currentView}
          onViewChange={handleViewChange}
          quickNumberQuery={quickQuery}
          onQuickNumberChange={setQuickQuery}
          onOpenKeypad={() => setShowKeypad(true)}
          onOpenAdvancedSearch={() => setShowAdvancedSearch(true)}
          isAdmin={canAccessAdminPanel}
          isAuthenticated={Boolean(user)}
          showPublicEvents={!user && currentView === 'public'}
          onAdminAuthClick={() => {
            if (!user) setShowLogin(true);
            else if (canAccessAdminPanel) setCurrentView(currentView === 'admin' ? 'public' : 'admin');
            else showToast('Somente administradores acessam o Painel Geral.');
          }}
          onSignOut={async () => {
            await signOut();
            setSidebarDrawerOpen(false);
            setCurrentView('public');
            showToast('Sessão encerrada.');
          }}
          favoritesCount={favorites.length}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavoritesOnly={() => {
            if (!user) {
              setShowLogin(true);
              showToast('Entre para usar favoritos.');
              return;
            }
            setShowFavoritesOnly(!showFavoritesOnly);
          }}
          onNewSongClick={() => {
            if (!canManageSongs) {
              if (!user) setShowLogin(true);
              else showToast('Somente administradores cadastram músicas.');
              return;
            }
            setSongToEdit('new');
          }}
          onOpenSidebar={() => setSidebarDrawerOpen(true)}
        />
      )}

      {!songMatch && (
      <div className="flex flex-1 w-full min-h-0">
        {user && (
          <AppSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            open={sidebarDrawerOpen}
            onClose={() => setSidebarDrawerOpen(false)}
            desktopExpanded={sidebarDesktopOpen}
            onToggleDesktop={() => setSidebarDesktop(!sidebarDesktopOpen)}
            orgOptions={orgOptions}
            activeOrgId={activeOrgId || undefined}
            onOrgChange={setActiveOrgId}
            userEmail={user.email}
            userDisplayName={profile?.display_name}
            userAvatarPath={profile?.avatar_path}
            permissions={{
              canAccessAdminPanel,
              canManageUsers,
              canManageChurches,
              canAccessLiturgies,
              canManageSchedules,
              canAccessEvents,
            }}
          />
        )}

      <main
        className={`flex-1 w-full min-w-0 py-6 sm:py-8 space-y-6 transition-[padding] duration-200 ${
          isEventDetail
            ? 'px-3 sm:px-4 lg:px-5 xl:px-6 2xl:px-8'
            : 'px-4 sm:px-6 lg:px-8'
        }`}
      >
        {!configured && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 text-sm text-rose-100 flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Configure <code className="mx-1">VITE_SUPABASE_URL</code> e{' '}
            <code className="mx-1">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
            <code className="mx-1">.env.local</code>.
          </div>
        )}

        {configured && songsQuery.isError && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 text-sm text-rose-100 flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Erro ao carregar songs</p>
              <p className="text-xs mt-1 opacity-90">
                {(songsQuery.error as Error)?.message || 'Falha na consulta à tabela songs.'}
              </p>
            </div>
          </div>
        )}

        {configured && user && !orgId && (
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-4 text-sm space-y-3">
            <p>Você ainda não pertence a nenhuma igreja. Crie uma em “Igrejas” ou entre com o código:</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Código de convite"
                className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs"
              />
              <button
                onClick={handleJoinOrg}
                className="px-4 py-2 bg-emerald-500 text-stone-950 font-bold rounded-button text-xs"
              >
                Entrar
              </button>
            </div>
          </div>
        )}

        {user && currentView === 'profile' ? (
          <ProfilePage onBack={() => setCurrentView('public')} />
        ) : user && currentView === 'admin' && canAccessAdminPanel ? (
          <AdminDashboard
            songs={songs}
            categories={categories}
            isLoading={songsQuery.isLoading}
            onNewSongClick={() => setSongToEdit('new')}
            onEditSongClick={(s) => setSongToEdit(s)}
            onDeleteSongClick={handleDeleteSong}
            onManageCategoriesClick={() => setShowCategoryManager(true)}
            onManageTagsClick={() => setShowTagManager(true)}
            onImportJSON={handleImportJSON}
            onResetFactory={() =>
              showToast('Reset de fábrica não se aplica com Supabase. Use o painel do projeto.')
            }
            onExportJSON={() =>
              downloadJsonBackup({
                songs,
                categories,
                churches,
                musicGroups,
                setlists,
                schedules: [],
                liturgies: [],
                systemUsers,
              })
            }
          />
        ) : user && currentView === 'setlist' ? (
          <SetlistManager
            setlists={setlists}
            songs={songs}
            systemUsers={systemUsers}
            currentUserId={user.id}
            memberGroupIds={musicGroups
              .filter((g) => g.members.some((m) => m.userId === user.id))
              .map((g) => g.id)}
            onSaveSetlist={handleSaveSetlist}
            onDeleteSetlist={handleDeleteSetlist}
            onArchiveSetlist={handleArchiveSetlist}
            onOpenProjectionPlaylist={(sequence) => setProjectionSongs(sequence)}
            onSelectSong={openSong}
          />
        ) : user && currentView === 'churches' && canManageChurches ? (
          <ChurchManager
            churches={churches}
            musicGroups={musicGroups}
            systemUsers={systemUsers}
            onSaveChurch={handleSaveChurch}
            onDeleteChurch={handleDeleteChurch}
            onSaveMusicGroup={handleSaveMusicGroup}
            onDeleteMusicGroup={handleDeleteMusicGroup}
            isAdmin={isAdmin}
            allowedChurchIds={churchEditorOrgIds}
            allowedGroupIds={groupEditorGroupIds}
            canEditChurch={canEditChurch}
            canEditGroup={canEditGroup}
          />
        ) : user && currentView === 'users' && canManageUsers ? (
          <UserManager
            systemUsers={systemUsers}
            churches={churches}
            musicGroups={musicGroups}
            currentUserIsAdmin={isAdmin}
            onSaveUser={async (u) => {
              await handleSaveUser(u);
              await refreshProfile();
              await refreshGrants();
            }}
            onDeleteUser={handleDeleteUser}
          />
        ) : user && currentView === 'events' && canAccessEvents && orgId ? (
          selectedEventId && eventBundle?.event ? (
            <EventDetail
              event={eventBundle.event}
              schedule={eventBundle.schedule}
              liturgy={eventBundle.liturgy}
              setlist={eventBundle.setlist}
              songs={songs}
              musicGroups={activeChurchGroups}
              systemUsers={systemUsers}
              canManageTeam={canAccessEvents}
              canManageLiturgy={canAccessLiturgies}
              canManageSetlist={canAccessEvents}
              onBack={() => setSelectedEventId(null)}
              onSaveSchedule={handleSaveSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onSaveLiturgy={handleSaveLiturgy}
              onDeleteLiturgy={handleDeleteLiturgy}
              onEnsureLiturgy={handleEnsureEventLiturgy}
              onSaveSetlist={handleSaveEventSetlist}
              onSaveEvent={handleSaveEvent}
              onSaveSongVersion={handleSaveEventSongVersion}
              onResetSongVersion={handleResetEventSongVersion}
              onSelectSong={openSong}
              onShareUpdated={invalidateEvents}
            />
          ) : selectedEventId && eventBundleQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando evento...
            </div>
          ) : (
            <EventManager
              events={events}
              musicGroups={activeChurchGroups}
              activeChurchId={orgId}
              onSaveEvent={handleSaveEvent}
              onSaveEventBatch={handleSaveEventBatch}
              onDeleteEvent={handleDeleteEvent}
              onOpenEvent={(id) => setSelectedEventId(id)}
            />
          )
        ) : (
          <div className="w-full space-y-4 sm:space-y-6">
            <AlphabetFilter
              selectedLetter={selectedLetter}
              onSelectLetter={(letter) => {
                setSelectedLetter(letter);
                if (letter !== 'TODAS' && sortBy === 'number') setSortBy('title');
              }}
              songs={songs.filter(
                (h) => activeCategoryPill === 'Todos' || h.category === activeCategoryPill,
              )}
            />

            <div className="flex flex-col gap-3 bg-stone-900/60 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-stone-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => {
                  const count = songs.filter((h) => h.category === cat.name).length;
                  const isSelected = activeCategoryPill === cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setActiveCategoryPill(isSelected ? 'Todos' : cat.name)
                      }
                      className={`min-h-9 px-3 py-1.5 rounded-button text-xs font-semibold transition-all border touch-manipulation ${
                        isSelected
                          ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-bold'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700/80'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                <div
                  className="flex items-center bg-stone-800 border border-stone-700 rounded-xl p-0.5"
                  role="group"
                  aria-label="Modo de visualização"
                >
                  <button
                    type="button"
                    onClick={() => handleSongsLayoutChange('cards')}
                    className={`flex items-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-button font-semibold transition-all touch-manipulation ${
                      songsLayout === 'cards'
                        ? 'bg-emerald-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Visualização em cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSongsLayoutChange('list')}
                    className={`flex items-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-button font-semibold transition-all touch-manipulation ${
                      songsLayout === 'list'
                        ? 'bg-emerald-500 text-stone-950'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Listagem simples"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Lista</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 min-w-0">
                  <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="shrink-0">Ordem</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'number' | 'title' | 'recent')}
                    className="min-h-9 bg-stone-800 border border-stone-700 text-stone-200 rounded-button px-2.5 py-1.5 font-medium focus:outline-none touch-manipulation"
                  >
                    <option value="number">Por Número</option>
                    <option value="title">Por Título</option>
                    <option value="recent">Mais Recentes</option>
                  </select>
                </label>
              </div>
            </div>

            {songsQuery.isLoading ? (
              <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-16 flex flex-col items-center justify-center gap-3 text-stone-400">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs font-medium">Carregando músicas…</p>
              </div>
            ) : sortedSongs.length > 0 ? (
              songsLayout === 'list' ? (
                <div className="flex flex-col gap-1.5">
                  {sortedSongs.map((song) => (
                    <SongListRow
                      key={song.id}
                      song={song}
                      isFavorite={Boolean(user) && favorites.includes(song.id)}
                      onToggleFavorite={user ? handleToggleFavorite : undefined}
                      onSelectSong={openSong}
                      onOpenProjection={(s) => setProjectionSongs([s])}
                      onAddToSetlist={user ? handleAddToSetlist : undefined}
                      isAdmin={Boolean(user) && canManageSongs}
                      onEditSong={canManageSongs ? (s) => setSongToEdit(s) : undefined}
                      onDeleteSong={canManageSongs ? handleDeleteSong : undefined}
                    />
                  ))}
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isFavorite={Boolean(user) && favorites.includes(song.id)}
                    onToggleFavorite={user ? handleToggleFavorite : undefined}
                    onSelectSong={openSong}
                    onOpenProjection={(s) => setProjectionSongs([s])}
                    onAddToSetlist={user ? handleAddToSetlist : undefined}
                    isAdmin={Boolean(user) && canManageSongs}
                    onEditSong={canManageSongs ? (s) => setSongToEdit(s) : undefined}
                    onDeleteSong={canManageSongs ? handleDeleteSong : undefined}
                  />
                ))}
              </div>
              )
            ) : (
              <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
                <Music className="w-12 h-12 text-stone-600 mx-auto" />
                <h3 className="text-xl font-serif font-bold text-stone-200">Nenhuma música encontrada</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {songs.length === 0
                    ? 'Nenhuma música visível na tabela songs (verifique is_public / org global e o RLS).'
                    : 'Não encontramos músicas com os filtros selecionados.'}
                </p>
                <button
                  onClick={() => {
                    setActiveCategoryPill('Todos');
                    setShowFavoritesOnly(false);
                    setQuickQuery('');
                    setAdvancedFilters(INITIAL_FILTERS);
                  }}
                  className="mt-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded-button text-xs font-semibold border border-stone-700"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      </div>
      )}

      {activeSongRouteId &&
        (selectedEventSongId
          ? selectedSongVersionQuery.isError
          : selectedSongQuery.isError) && (
        <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col items-center justify-center gap-3 text-stone-100 px-6">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <p className="text-sm font-semibold">
            {selectedEventSongId ? 'Versão não encontrada' : 'Música não encontrada'}
          </p>
          <p className="text-xs text-stone-400 text-center max-w-sm">
            {(
              (selectedEventSongId
                ? selectedSongVersionQuery.error
                : selectedSongQuery.error) as Error
            )?.message ||
              'Este link pode estar inválido ou a música não está disponível.'}
          </p>
          <button
            type="button"
            onClick={closeSongPage}
            className="mt-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded-button text-xs font-semibold border border-stone-700"
          >
            Voltar
          </button>
        </div>
      )}

      {activeSongRouteId &&
        !(selectedEventSongId
          ? selectedSongVersionQuery.isError
          : selectedSongQuery.isError) && (
        <SongDetailModal
          song={selectedSong}
          eventVersion={
            songEventVersion
              ? {
                  title: songEventVersion.title,
                  date: songEventVersion.date,
                  time: songEventVersion.time,
                }
              : null
          }
          isLoading={
            selectedEventSongId
              ? selectedSongVersionQuery.isLoading ||
                (!selectedSongVersionQuery.data && selectedSongVersionQuery.isFetching)
              : selectedSongQuery.isLoading ||
                (!selectedSongQuery.data && selectedSongQuery.isFetching)
          }
          onClose={closeSongPage}
          isFavorite={Boolean(user) && Boolean(catalogSongId) && favorites.includes(catalogSongId!)}
          onToggleFavorite={user ? handleToggleFavorite : undefined}
          onOpenProjection={(s) => setProjectionSongs([s])}
          onAddToSetlist={user ? handleAddToSetlist : undefined}
          isAdmin={Boolean(user) && canManageSongs && !selectedEventSongId}
          onEditSong={
            canManageSongs && !selectedEventSongId
              ? () => {
                  if (selectedSongQuery.data) setSongToEdit(selectedSongQuery.data);
                }
              : undefined
          }
        />
      )}

      {projectionSongs && (
        <SongProjectionModal
          songsSequence={projectionSongs}
          onClose={() => setProjectionSongs(null)}
        />
      )}

      {showKeypad && (
        <NumericKeypadModal
          songs={songs}
          onClose={() => setShowKeypad(false)}
          onSelectSong={openSong}
        />
      )}

      {showAdvancedSearch && (
        <AdvancedSearchModal
          categories={categories}
          filters={advancedFilters}
          onApplyFilters={setAdvancedFilters}
          onResetFilters={() => setAdvancedFilters(INITIAL_FILTERS)}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}

      {songToAddToSetlist && (
        <AddToSetlistModal
          song={songToAddToSetlist}
          setlists={setlists}
          onClose={() => setSongToAddToSetlist(null)}
          onConfirm={handleConfirmAddToSetlist}
        />
      )}

      {canManageSongs && songToEdit && (
        <SongFormModal
          songToEdit={songToEdit === 'new' ? null : songToEdit}
          categories={categories}
          existingNumbers={songs
            .map((h) => h.number)
            .filter((n): n is number => typeof n === 'number' && n > 0)}
          onSave={handleSaveSong}
          onClose={() => setSongToEdit(null)}
        />
      )}

      {canManageSongs && showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onSaveCategories={handleSaveCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {canManageSongs && showTagManager && (
        <TagManagerModal
          songs={songs}
          onRenameTag={async (from, to) => {
            if (!requireOrg()) return;
            const affected = songs.filter((s) => (s.tags || []).includes(from));
            try {
              await Promise.all(
                affected.map((song) => {
                  const tags = Array.from(
                    new Set((song.tags || []).map((t) => (t === from ? to : t))),
                  );
                  return songsService.upsertSong(orgId!, { ...song, tags });
                }),
              );
              await queryClient.invalidateQueries({ queryKey: ['songs'] });
              showToast(`Tag renomeada para "${to}".`);
            } catch (err) {
              showToast((err as Error).message || 'Erro ao renomear tag');
            }
          }}
          onDeleteTag={async (tag) => {
            if (!requireOrg()) return;
            const affected = songs.filter((s) => (s.tags || []).includes(tag));
            try {
              await Promise.all(
                affected.map((song) => {
                  const tags = (song.tags || []).filter((t) => t !== tag);
                  return songsService.upsertSong(orgId!, { ...song, tags });
                }),
              );
              await queryClient.invalidateQueries({ queryKey: ['songs'] });
              showToast(`Tag "${tag}" removida.`);
            } catch (err) {
              showToast((err as Error).message || 'Erro ao remover tag');
            }
          }}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}
