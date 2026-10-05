import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useApiBusy } from '@/contexts/ApiBusyProvider';
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
import { AppliedAdvancedFiltersBar } from './components/AppliedAdvancedFiltersBar';
import { SetlistManager } from './components/SetlistManager';
import { AddToSetlistModal } from './components/AddToSetlistModal';
import { PublicSetlistPage } from './components/PublicSetlistPage';
import { PublicEventPage } from './components/PublicEventPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { RegisterPage } from './components/RegisterPage';
import { AccountManager } from './components/AccountManager';
import { AdminDashboard } from './components/AdminDashboard';
import { SongFormModal } from './components/SongFormModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { TagManagerModal } from './components/TagManagerModal';
import { ChurchManager } from './components/ChurchManager';
import { ChurchWorkspace, WORKSPACE_VIEWS } from './components/ChurchWorkspace';
import { OrganizationManager } from './components/OrganizationManager';
import { EventManager } from './components/EventManager';
import { EventDetail } from './components/EventDetail';
import { UserManager } from './components/UserManager';
import { InviteAcceptPage } from './components/InviteAcceptPage';
import { AlphabetFilter, AlphabetFilterToggle } from './components/AlphabetFilter';
import { SongTypeFilter, matchesSongTypeFilter } from './components/SongTypeFilter';
import { AppSidebar } from './components/AppSidebar';
import { AppTopbar } from './components/AppTopbar';
import { MobileNav } from './components/MobileNav';
import { CatalogSearchBar } from './components/CatalogSearchBar';
import { ProfilePage } from './components/ProfilePage';
import { HomeDashboard } from './components/HomeDashboard';
import { ChurchesPage } from './components/ChurchesPage';
import { MorePage } from './components/MorePage';
import { PageHeader } from './components/PageHeader';
import {
  Music,
  Music2,
  ArrowUpDown,
  AlertCircle,
  LayoutGrid,
  List,
  Loader2,
  Church as ChurchIcon,
  KeyRound,
  SearchX,
  FilterX,
  Settings2,
} from 'lucide-react';
import { CatalogSongsLoading } from './components/CatalogSongsLoading';
import { HelpModal } from './components/HelpModal';
import { useConfirm } from '@/contexts/ConfirmProvider';
import { getAvatarPublicUrl } from '@/utils/avatarUrl';
import { Alert, Button, Chip, EmptyState, Input, Select, cn } from './components/ui';

type SongsLayoutMode = 'cards' | 'list';
const SONGS_LAYOUT_KEY = 'louvorhub_songs_layout';

const VALID_VIEWS: ViewMode[] = [
  'home',
  'churchList',
  'more',
  'public',
  'register',
  'workspace',
  'setlist',
  'churches',
  'organizations',
  'events',
  'schedules',
  'liturgies',
  'users',
  'accounts',
  'admin',
  'profile',
];

/** Lê `?view=` (atalhos do PWA) e limpa a URL. */
function readInitialView(): ViewMode | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v && (VALID_VIEWS as string[]).includes(v)) return v as ViewMode;
  } catch {
    /* ignore */
  }
  return null;
}

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
  const inviteMatch = useMatch('/convite/:token');
  const selectedEventSongId = songVersionMatch?.params.eventSongId ?? null;
  const selectedSongId = selectedEventSongId
    ? null
    : (songMatch?.params.songId ?? null);
  const playlistShareCode =
    playlistShareMatch?.params.shareCode ??
    legacyPlaylistShareMatch?.params.shareCode ??
    null;
  const eventShareCode = eventShareMatch?.params.shareCode ?? null;
  const inviteToken = inviteMatch?.params.token ?? null;
  const { ready, user, profile, signOut, configured, refreshMemberships, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { withBusy } = useApiBusy();
  const confirm = useConfirm();
  const { orgId, memberships, setActiveOrgId, activeOrgId } = useOrg();
  const {
    isAdmin,
    canAccessAdminPanel,
    canManageUsers,
    canManageOrgMembers,
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

  const [pendingShortcutView] = useState<ViewMode | null>(readInitialView);
  const [currentView, setCurrentView] = useState<ViewMode>('public');
  const [activeCategoryPill, setActiveCategoryPill] = useState('Todos');
  const [selectedLetter, setSelectedLetter] = useState('TODAS');
  const [alphabetExpanded, setAlphabetExpanded] = useState(false);
  const [showHinos, setShowHinos] = useState(true);
  const [showCanticos, setShowCanticos] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoritesFilterLoading, setFavoritesFilterLoading] = useState(false);
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
  const [showHelp, setShowHelp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [songToEdit, setSongToEdit] = useState<Song | null | 'new'>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [churchEditRequestKey, setChurchEditRequestKey] = useState(0);
  const [createOrgOnOpen, setCreateOrgOnOpen] = useState(false);
  const [songToAddToSetlist, setSongToAddToSetlist] = useState<Song | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const isEventDetail = Boolean(user && selectedEventId);

  const PROTECTED_VIEWS: ViewMode[] = [
    'home',
    'churchList',
    'more',
    'workspace',
    'setlist',
    'churches',
    'organizations',
    'users',
    'accounts',
    'events',
    'schedules',
    'liturgies',
    'admin',
    'profile',
  ];

  const canManageActiveOrgMembers = canManageOrgMembers(orgId);

  const handleViewChange = (view: ViewMode) => {
    if (!user && PROTECTED_VIEWS.includes(view)) {
      setShowLogin(true);
      showToast('Entre para acessar esta área.');
      return;
    }
    if (user) {
      if (view === 'admin' && !canAccessAdminPanel) {
        showToast('Somente administradores gerenciam músicas.');
        return;
      }
      if (view === 'organizations' && !canAccessAdminPanel) {
        showToast('Somente administradores gerenciam igrejas.');
        return;
      }
      if (view === 'accounts' && !canManageUsers) {
        showToast('Somente administradores gerenciam contas.');
        return;
      }
      if (view === 'workspace' && !orgId) {
        showToast('Associe-se a uma igreja para abrir o workspace.');
        return;
      }
      if (view === 'users' && !canManageActiveOrgMembers) {
        showToast('Sem permissão para gerenciar membros desta igreja.');
        return;
      }
      if (view === 'churches' && !canManageChurches) {
        showToast('Sem permissão para gerenciar grupos e bandas.');
        return;
      }
      if (view === 'events' && !orgId) {
        showToast('Associe-se a uma igreja para ver a agenda.');
        return;
      }
      if (view === 'events' && !canAccessEvents) {
        showToast('Sem permissão para acessar eventos.');
        return;
      }
    }
    setSelectedEventId(null);
    if (view !== 'organizations') setCreateOrgOnOpen(false);
    if (view !== currentView) window.scrollTo({ top: 0 });
    setCurrentView(view);
  };

  const openEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    window.scrollTo({ top: 0 });
  };

  const openChurch = (churchId: string) => {
    if (churchId !== orgId) setActiveOrgId(churchId);
    setSelectedEventId(null);
    setCurrentView('workspace');
    window.scrollTo({ top: 0 });
  };

  const goToCatalog = () => {
    if (currentView === 'public') return;
    setSelectedEventId(null);
    setCurrentView('public');
  };

  const handleQuickQueryChange = (val: string) => {
    setQuickQuery(val);
    if (val.trim()) goToCatalog();
  };

  // Atalhos do PWA (?view=setlist etc.): aplica após a sessão estar pronta.
  useEffect(() => {
    if (!ready || !pendingShortcutView) return;
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (pendingShortcutView === 'public') return;
    if (!user && PROTECTED_VIEWS.includes(pendingShortcutView)) {
      setShowLogin(true);
      return;
    }
    if (pendingShortcutView === 'workspace' && !orgId) return;
    setCurrentView(pendingShortcutView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pendingShortcutView, user, orgId]);

  // Ao entrar (ou reabrir com sessão ativa), o ambiente privado começa no Início.
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    if (id && id !== lastUserIdRef.current && !pendingShortcutView) {
      setCurrentView((v) => (v === 'public' ? 'home' : v));
    }
    lastUserIdRef.current = id;
  }, [user?.id, pendingShortcutView]);

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

  const allOrganizationsQuery = useQuery({
    queryKey: ['allOrganizations'],
    enabled: Boolean(configured && user?.id && canAccessAdminPanel),
    queryFn: () => orgsService.listAllVisibleOrganizations(),
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
  const catalogSongsLoading =
    Boolean(configured) &&
    !songsQuery.isError &&
    (songsQuery.isLoading ||
      (!songsQuery.data && (songsQuery.isPending || songsQuery.isFetching)));
  const categories = categoriesQuery.data || [];
  const favorites = favoritesQuery.data || [];
  const churches = churchesQuery.data || [];
  const allOrganizations = allOrganizationsQuery.data || [];
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
    return withBusy(() =>
      saveSongMutation.mutateAsync({
        ...song,
        categoryId: category?.id || song.categoryId,
        category: category?.name || song.category,
        // Sempre enviar array (mesmo vazio) para o serviço não usar fallback legado
        mediaLinks: song.mediaLinks ?? [],
        youtubeUrl: song.youtubeUrl,
        spotifyUrl: song.spotifyUrl,
        otherMediaUrl: song.otherMediaUrl,
      }),
    );
  };

  const handleDeleteSong = async (song: Song) => {
    const label = song.number ? `hino #${song.number}` : `cântico "${song.title}"`;
    const ok = await confirm({
      title: 'Excluir música',
      message: `Tem certeza que deseja excluir o ${label}? Ele sairá do catálogo e das playlists.`,
      confirmLabel: 'Excluir música',
    });
    if (ok) void withBusy(() => deleteSongMutation.mutateAsync(song.id));
  };

  const handleSaveCategories = async (updated: Category[]) => {
    if (!requireOrg()) return;
    return withBusy(async () => {
      try {
        await categoriesService.replaceCategories(orgId!, updated);
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        showToast('Categorias atualizadas!');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveSetlist = async (setlist: Setlist) => {
    if (!user) {
      showToast('Faça login para salvar a playlist.');
      return;
    }
    return withBusy(async () => {
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
    });
  };

  const handleDeleteSetlist = async (id: string) => {
    return withBusy(async () => {
      try {
        await playlistsService.deleteSetlist(id);
        await queryClient.invalidateQueries({ queryKey: ['setlists'] });
        showToast('Playlist excluída.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleArchiveSetlist = async (id: string, archived: boolean) => {
    return withBusy(async () => {
      try {
        await playlistsService.setSetlistArchived(id, archived);
        await queryClient.invalidateQueries({ queryKey: ['setlists'] });
        showToast(archived ? 'Playlist arquivada.' : 'Playlist desarquivada.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const isTempChurchId = (id: string) =>
    id.startsWith('temp-') || id.startsWith('temp-org-') || id.startsWith('church-');

  const handleSaveChurch = async (church: Church) => {
    if (!user) {
      const err = new Error('Faça login para gerenciar igrejas.');
      showToast(err.message);
      throw err;
    }
    return withBusy(async () => {
      try {
        if (church.id && !isTempChurchId(church.id)) {
          await orgsService.updateOrganization(church);
        } else {
          const created = await orgsService.createOrganization(user.id, church);
          setActiveOrgId(created.id);
        }
        await refreshMemberships();
        await queryClient.invalidateQueries({ queryKey: ['churches'] });
        await queryClient.invalidateQueries({ queryKey: ['allOrganizations'] });
        showToast(`Igreja "${church.name}" salva!`);
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleDeleteChurch = async (id: string) => {
    const ok = await confirm({
      title: 'Remover igreja',
      message: 'Todos os eventos, grupos e membros vinculados serão perdidos. Esta ação é irreversível.',
      confirmLabel: 'Remover igreja',
    });
    if (!ok) return;
    return withBusy(async () => {
      try {
        await orgsService.deleteOrganization(id);
        await refreshMemberships();
        await invalidateAll();
        await queryClient.invalidateQueries({ queryKey: ['allOrganizations'] });
        showToast('Igreja removida.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveMusicGroup = async (group: MusicGroup) => {
    return withBusy(async () => {
      try {
        await musicGroupsService.upsertMusicGroup(group);
        await queryClient.invalidateQueries({ queryKey: ['musicGroups'] });
        showToast(`Grupo "${group.name}" salvo!`);
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleDeleteMusicGroup = async (id: string) => {
    return withBusy(async () => {
      try {
        await musicGroupsService.deleteMusicGroup(id);
        await queryClient.invalidateQueries({ queryKey: ['musicGroups'] });
        showToast('Grupo de louvor removido.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const invalidateEvents = async () => {
    await queryClient.invalidateQueries({ queryKey: ['events'] });
    await queryClient.invalidateQueries({ queryKey: ['event-bundle'] });
    await queryClient.invalidateQueries({ queryKey: ['song-version'] });
  };

  const handleSaveEvent = async (event: ChurchEvent) => {
    if (!requireOrg()) return;
    return withBusy(async () => {
      try {
        await eventsService.upsertEvent(user?.id, { ...event, churchId: orgId! });
        await invalidateEvents();
        showToast('Evento salvo!');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveEventBatch = async (
    event: ChurchEvent,
    count: number,
    intervalDays: number,
  ) => {
    if (!requireOrg()) return;
    return withBusy(async () => {
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
        throw err;
      }
    });
  };

  const handleDeleteEvent = async (id: string) => {
    return withBusy(async () => {
      try {
        await eventsService.deleteEvent(id);
        if (selectedEventId === id) setSelectedEventId(null);
        await invalidateEvents();
        showToast('Evento removido.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveSchedule = async (schedule: WorshipSchedule | WorshipSchedule[]) => {
    return withBusy(async () => {
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
        throw err;
      }
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    return withBusy(async () => {
      try {
        await schedulesService.deleteSchedule(id);
        await invalidateEvents();
        showToast('Escala removida.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveLiturgy = async (liturgy: Liturgy) => {
    return withBusy(async () => {
      try {
        const eventId = liturgy.eventId || selectedEventId || undefined;
        const eventTitle =
          (eventId && eventId === eventBundle?.event?.id
            ? eventBundle.event.title
            : undefined) || liturgy.serviceTitle;
        const eventDate =
          (eventId && eventId === eventBundle?.event?.id
            ? eventBundle.event.date
            : undefined) || liturgy.date;
        await liturgiesService.upsertLiturgy(user?.id, {
          ...liturgy,
          eventId,
          serviceTitle: eventTitle || liturgy.serviceTitle,
          date: eventDate || liturgy.date,
        });
        await invalidateEvents();
        showToast('Liturgia salva!');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleDeleteLiturgy = async (id: string) => {
    return withBusy(async () => {
      try {
        await liturgiesService.deleteLiturgy(id);
        await invalidateEvents();
        showToast('Liturgia removida.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleEnsureEventLiturgy = async () => {
    if (!selectedEventId || !eventBundle?.event) return;
    return withBusy(async () => {
      try {
        await eventsService.ensureEventLiturgy(user?.id, eventBundle.event);
        await invalidateEvents();
        showToast('Liturgia criada para o evento.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveEventSetlist = async (setlist: Setlist) => {
    if (!requireOrg()) return;
    const eventId = selectedEventId || setlist.eventId;
    if (!eventId) {
      showToast('Evento não encontrado.');
      return;
    }
    return withBusy(async () => {
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
        throw err;
      }
    });
  };

  const handleSaveEventSongVersion = async (customization: ScheduleSongCustomization) => {
    const eventId = selectedEventId || eventBundle?.event?.id;
    if (!eventId) {
      showToast('Evento não encontrado.');
      return;
    }
    return withBusy(async () => {
      try {
        await eventSongsService.upsertEventSongVersion({
          eventId,
          customization,
        });
        await invalidateEvents();
        showToast('Versão do evento salva!');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleResetEventSongVersion = async (songId: string) => {
    const eventId = selectedEventId || eventBundle?.event?.id;
    if (!eventId) return;
    return withBusy(async () => {
      try {
        await eventSongsService.resetEventSongVersion(eventId, songId);
        await invalidateEvents();
        showToast('Versão do evento removida. Catálogo restaurado.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleSaveUser = async (member: SystemUser) => {
    if (!requireOrg()) return;
    const isNew = !member.id || member.id.startsWith('temp-') || !member.membershipId;
    return withBusy(async () => {
      try {
        await membersService.upsertSystemUserAsProfile(orgId!, member);
        await queryClient.invalidateQueries({ queryKey: ['members'] });
        showToast(
          isNew
            ? `Integrante "${member.name}" associado à igreja!`
            : `Usuário "${member.name}" atualizado!`,
        );
      } catch (err) {
        const message = (err as Error).message || 'Não foi possível salvar o usuário.';
        showToast(message);
        throw err;
      }
    });
  };

  const handleDeleteUser = async (id: string) => {
    const member = systemUsers.find((u) => u.id === id);
    if (!member?.membershipId) {
      showToast('Membership não encontrado.');
      return;
    }
    return withBusy(async () => {
      try {
        await membersService.removeMembership(member.membershipId);
        await queryClient.invalidateQueries({ queryKey: ['members'] });
        showToast('Membro removido da igreja.');
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
  };

  const handleToggleFavoritesOnly = async () => {
    if (!user) {
      setShowLogin(true);
      showToast('Entre para usar favoritos.');
      return;
    }
    const next = !showFavoritesOnly;
    setShowFavoritesOnly(next);
    setFavoritesFilterLoading(true);
    const started = Date.now();
    try {
      await queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
      await favoritesQuery.refetch();
    } catch (err) {
      showToast((err as Error).message || 'Não foi possível atualizar favoritos.');
    } finally {
      const elapsed = Date.now() - started;
      if (elapsed < 280) {
        await new Promise((r) => setTimeout(r, 280 - elapsed));
      }
      setFavoritesFilterLoading(false);
    }
  };

  const handleToggleFavorite = async (songId: string) => {
    if (!user) {
      setShowLogin(true);
      showToast('Entre para salvar favoritos.');
      return;
    }
    return withBusy(async () => {
      try {
        const next = await favoritesService.toggleFavorite(user.id, songId);
        queryClient.setQueryData(['favorites', user.id], next);
      } catch (err) {
        showToast((err as Error).message);
        throw err;
      }
    });
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
    return withBusy(async () => {
      if ((setlist.items ?? []).some((i) => i.songId === song.id)) {
        throw new Error(`${name} já está nesta playlist.`);
      }
      await playlistsService.upsertSetlist(user.id, {
        ...setlist,
        orgId: null,
        groupId: null,
        items: [...(setlist.items ?? []), { id: `item-${Date.now()}`, songId: song.id }],
      });
      await queryClient.invalidateQueries({ queryKey: ['setlists'] });
      showToast(`${name} adicionado a "${setlist.title}"!`);
    });
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
        showToast('Dados importados com sucesso!');
      } catch {
        showToast('Formato de arquivo JSON inválido.', 'error');
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

  const handleToggleHinos = () => {
    let nextHinos: boolean;
    let nextCanticos: boolean;

    if (showHinos && !showCanticos) {
      nextHinos = false;
      nextCanticos = true;
    } else {
      nextHinos = !showHinos;
      nextCanticos = showCanticos;
    }

    setShowHinos(nextHinos);
    setShowCanticos(nextCanticos);

    if (nextHinos && !nextCanticos) {
      showToast('Exibindo apenas hinos');
    } else if (!nextHinos && nextCanticos) {
      showToast('Exibindo apenas cânticos');
    }
  };

  const handleToggleCanticos = () => {
    let nextHinos: boolean;
    let nextCanticos: boolean;

    if (showCanticos && !showHinos) {
      nextCanticos = false;
      nextHinos = true;
    } else {
      nextCanticos = !showCanticos;
      nextHinos = showHinos;
    }

    setShowHinos(nextHinos);
    setShowCanticos(nextCanticos);

    if (nextHinos && !nextCanticos) {
      showToast('Exibindo apenas hinos');
    } else if (!nextHinos && nextCanticos) {
      showToast('Exibindo apenas cânticos');
    }
  };

  const filteredSongs = songs.filter((h) => {
    if (!matchesSongTypeFilter(h, showHinos, showCanticos)) return false;
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
    .map((m) => ({
      id: m.org_id,
      name: m.organizations!.name,
      sigla: m.organizations!.sigla || null,
    }));

  const workspaceChurch: Church | null = useMemo(() => {
    if (!orgId) return null;
    const fromList = churches.find((c) => c.id === orgId);
    if (fromList) return fromList;
    const membershipOrg = memberships.find((m) => m.org_id === orgId)?.organizations;
    if (!membershipOrg) {
      return { id: orgId, name: 'Igreja', city: '', createdAt: new Date().toISOString() };
    }
    return {
      id: orgId,
      name: membershipOrg.name,
      city: membershipOrg.city || '',
      address: membershipOrg.address || undefined,
      leader: membershipOrg.leader || undefined,
      phone: membershipOrg.phone || undefined,
      sigla: membershipOrg.sigla,
      color: membershipOrg.color || undefined,
      createdAt: membershipOrg.created_at || new Date().toISOString(),
    };
  }, [orgId, churches, memberships]);

  if (inviteToken) {
    return (
      <div className="min-h-screen bg-app text-fg font-sans">
        <InviteAcceptPage />
      </div>
    );
  }

  if (eventShareCode) {
    return <PublicEventPage shareCode={eventShareCode} />;
  }

  if (playlistShareCode) {
    return <PublicSetlistPage shareCode={playlistShareCode} />;
  }

  if (!ready) {
    const loadingSongs =
      Boolean(configured) &&
      !songsQuery.data &&
      !songsQuery.isError &&
      (songsQuery.isPending || songsQuery.isFetching);
    return (
      <div className="min-h-[100dvh] bg-app text-fg flex flex-col items-center justify-center gap-5 px-6 animate-in fade-in duration-300">
        <span className="btn-gradient w-20 h-20 rounded-3xl flex items-center justify-center shadow-card-lg">
          <Music2 className="w-10 h-10" strokeWidth={2.4} />
        </span>
        <div className="text-center space-y-1">
          <p className="text-2xl font-medium tracking-tight">
            Louvor<b className="font-extrabold text-brand-text">Hub</b>
          </p>
          <p className="text-xs text-fg-subtle">
            {loadingSongs ? 'Montando o catálogo de músicas…' : 'Preparando sua sessão…'}
          </p>
        </div>
        <Loader2 className="w-6 h-6 text-brand-text animate-spin" />
      </div>
    );
  }

  const showMobileNav = Boolean(user) && !songMatch && !songVersionMatch;
  const userName =
    profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Usuário';
  const userAvatarUrl = getAvatarPublicUrl(profile?.avatar_path, profile?.updated_at);
  const roleLabel = isAdmin
    ? 'Administrador'
    : canManageActiveOrgMembers
      ? 'Líder'
      : 'Membro';
  const churchList = orgOptions.map((o) => {
    const c = churches.find((ch) => ch.id === o.id);
    return {
      id: o.id,
      name: c?.name || o.name,
      city: c?.city,
      sigla: c?.sigla ?? o.sigla,
      color: c?.color,
    };
  });
  const groupNameById = (id?: string) => musicGroups.find((g) => g.id === id)?.name;
  const NARROW_VIEWS: ViewMode[] = ['home', 'more', 'churchList', 'profile', 'events', 'workspace', 'churches', 'users'];
  const contentWidth = !user
    ? 'max-w-none'
    : isEventDetail
      ? 'max-w-6xl'
      : NARROW_VIEWS.includes(currentView)
        ? 'max-w-3xl'
        : 'max-w-7xl';

  const handleSignOut = async () => {
    await signOut();
    setSelectedEventId(null);
    setCurrentView('public');
    showToast('Sessão encerrada.');
  };

  return (
    <div className="min-h-[100dvh] bg-app text-fg flex flex-col font-sans">
      {!songMatch && !user && (
        <Header
          onViewChange={handleViewChange}
          quickNumberQuery={quickQuery}
          onQuickNumberChange={handleQuickQueryChange}
          onOpenKeypad={() => setShowKeypad(true)}
          onOpenAdvancedSearch={() => setShowAdvancedSearch(true)}
          isAuthenticated={false}
          showPublicEvents={currentView === 'public'}
          onAdminAuthClick={() => setShowLogin(true)}
          onSignOut={handleSignOut}
          favoritesCount={favorites.length}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavoritesOnly={() => {
            void handleToggleFavoritesOnly();
          }}
          currentView={currentView}
        />
      )}

      {!songMatch && user && (
        <>
          <AppSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            roleLabel={roleLabel}
            showAgenda={Boolean(orgId && canAccessEvents)}
            showAccounts={canManageUsers}
            onSignOut={() => void handleSignOut()}
          />
          <AppTopbar
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            onHome={() => handleViewChange('home')}
            onProfile={() => handleViewChange('profile')}
          />
        </>
      )}

      {!songMatch && (
      <div className={cn('flex flex-1 w-full min-h-0', user && 'lg:pl-64')}>
      <main
        className={cn(
          'flex-1 w-full min-w-0 mx-auto space-y-4 sm:space-y-6',
          contentWidth,
          user ? 'px-4 sm:px-6 lg:px-8 pt-2 pb-6 lg:pt-8' : 'px-3 sm:px-6 lg:px-8 py-3 sm:py-6',
          showMobileNav && 'pb-nav lg:pb-8',
        )}
      >
        {!configured && (
          <Alert tone="danger" title="Backend não configurado">
            Configure <code className="mx-0.5 font-mono">VITE_SUPABASE_URL</code> e{' '}
            <code className="mx-0.5 font-mono">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
            <code className="mx-0.5 font-mono">.env.local</code>.
          </Alert>
        )}

        {configured && songsQuery.isError && (
          <Alert
            tone="danger"
            title="Não foi possível carregar as músicas"
            action={
              <Button size="xs" variant="danger-soft" onClick={() => void songsQuery.refetch()}>
                Tentar novamente
              </Button>
            }
          >
            {(songsQuery.error as Error)?.message || 'Falha na consulta ao catálogo.'}
          </Alert>
        )}

        {configured && user && !orgId && currentView === 'home' && (
          <div className="ui-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand-text border border-brand-line flex items-center justify-center shrink-0">
                <ChurchIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg">Você ainda não faz parte de uma igreja</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  Peça o código de convite ao líder da sua igreja e informe abaixo.
                </p>
              </div>
            </div>
            <form
              className="flex gap-2 w-full sm:w-auto"
              onSubmit={(e) => {
                e.preventDefault();
                void handleJoinOrg();
              }}
            >
              <div className="relative flex-1 sm:w-56">
                <KeyRound className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Código de convite"
                  aria-label="Código de convite"
                  className="pl-9 min-h-10"
                  autoCapitalize="characters"
                />
              </div>
              <Button type="submit" size="sm" className="h-10" disabled={!joinCode.trim()}>
                Entrar
              </Button>
            </form>
          </div>
        )}

        {currentView === 'register' ? (
          <RegisterPage
            onBack={() => setCurrentView('public')}
            onGoToLogin={() => {
              setCurrentView('public');
              setShowLogin(true);
            }}
          />
        ) : user && isEventDetail ? (
          eventBundle?.event ? (
            <div className="space-y-4">
              <PageHeader
                title={eventBundle.event.title}
                description={workspaceChurch?.name}
                onBack={() => setSelectedEventId(null)}
                backLabel="Voltar"
              />
              <EventDetail
                event={eventBundle.event}
                schedule={eventBundle.schedule}
                liturgy={eventBundle.liturgy}
                setlist={eventBundle.setlist}
                songs={songs}
                musicGroups={activeChurchGroups}
                systemUsers={systemUsers}
                churchName={workspaceChurch?.name}
                canManageTeam={canAccessEvents}
                canManageLiturgy={canAccessLiturgies}
                canManageSetlist={canAccessEvents}
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
            </div>
          ) : eventBundleQuery.isError ? (
            <EmptyState
              tone="danger"
              icon={AlertCircle}
              title="Evento não encontrado"
              description={(eventBundleQuery.error as Error)?.message || 'Não foi possível carregar o evento.'}
              action={
                <Button variant="secondary" onClick={() => setSelectedEventId(null)}>
                  Voltar
                </Button>
              }
            />
          ) : (
            <div className="flex items-center justify-center py-20 text-fg-subtle gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando evento...
            </div>
          )
        ) : user && currentView === 'home' ? (
          <HomeDashboard
            userName={userName}
            churchName={workspaceChurch?.name}
            churchColor={workspaceChurch?.color}
            canAccessEvents={Boolean(orgId && canAccessEvents)}
            events={events}
            musicGroups={activeChurchGroups}
            setlists={setlists}
            songsCount={songs.length}
            churchesCount={orgOptions.length}
            onNavigate={handleViewChange}
            onOpenEvent={openEvent}
          />
        ) : user && currentView === 'more' ? (
          <MorePage
            userName={userName}
            userEmail={user.email}
            userAvatarUrl={userAvatarUrl}
            roleLabel={roleLabel}
            canManageSongs={canAccessAdminPanel}
            canManageChurches={canAccessAdminPanel}
            canManageUsers={canManageUsers}
            onNavigate={handleViewChange}
            onOpenHelp={() => setShowHelp(true)}
            onSignOut={() => void handleSignOut()}
          />
        ) : user && currentView === 'churchList' ? (
          <ChurchesPage
            churches={churchList}
            activeOrgId={orgId}
            groupsCount={(id) => musicGroups.filter((g) => g.churchId === id).length}
            membersCount={systemUsers.length}
            onOpen={openChurch}
            onManageAll={canAccessAdminPanel ? () => handleViewChange('organizations') : undefined}
            onCreate={
              canAccessAdminPanel
                ? () => {
                    handleViewChange('organizations');
                    setCreateOrgOnOpen(true);
                  }
                : undefined
            }
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            onJoin={() => void handleJoinOrg()}
          />
        ) : user && currentView === 'events' && orgId && canAccessEvents ? (
          <EventManager
            events={events}
            musicGroups={activeChurchGroups}
            activeChurchId={orgId}
            churchName={workspaceChurch?.name}
            churchColor={workspaceChurch?.color}
            onSaveEvent={handleSaveEvent}
            onSaveEventBatch={handleSaveEventBatch}
            onDeleteEvent={handleDeleteEvent}
            onOpenEvent={openEvent}
            toolbar={
              churchList.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                  {churchList.map((c) => (
                    <Chip
                      key={c.id}
                      active={c.id === orgId}
                      dotColor={c.color || '#4f46e5'}
                      onClick={() => c.id !== orgId && setActiveOrgId(c.id)}
                      title={c.name}
                    >
                      {c.sigla?.trim() || c.name}
                    </Chip>
                  ))}
                </div>
              ) : undefined
            }
          />
        ) : user && currentView === 'profile' ? (
          <ProfilePage onBack={() => handleViewChange('more')} />
        ) : user && currentView === 'admin' && canAccessAdminPanel ? (
          <AdminDashboard
            songs={songs}
            categories={categories}
            isLoading={catalogSongsLoading}
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
        ) : user && orgId && workspaceChurch && WORKSPACE_VIEWS.includes(currentView) ? (
          <ChurchWorkspace
            church={workspaceChurch}
            currentView={currentView}
            canAccessEvents={canAccessEvents}
            canManageGroups={canManageChurches}
            canManageMembers={canManageActiveOrgMembers}
            canEditChurch={canEditChurch(orgId)}
            onSaveChurch={handleSaveChurch}
            onNavigate={handleViewChange}
            onBack={() => handleViewChange('churchList')}
            editRequestKey={churchEditRequestKey}
            events={events}
            groupsCount={activeChurchGroups.length}
            membersCount={systemUsers.length}
            groupName={groupNameById}
            onOpenEvent={openEvent}
          >
            {currentView === 'churches' && canManageChurches ? (
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
                lockedChurchId={orgId}
                embedded
              />
            ) : currentView === 'users' && canManageActiveOrgMembers ? (
              <UserManager
                orgId={orgId}
                orgName={workspaceChurch?.name}
                systemUsers={systemUsers}
                churches={churches}
                musicGroups={musicGroups}
                currentUserIsAdmin={isAdmin}
                embedded
                onSaveUser={async (u) => {
                  await handleSaveUser(u);
                  await refreshProfile();
                  await refreshGrants();
                }}
                onDeleteUser={handleDeleteUser}
              />
            ) : null}
          </ChurchWorkspace>
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
        ) : user && currentView === 'organizations' && canAccessAdminPanel ? (
          <OrganizationManager
            churches={allOrganizations}
            loading={allOrganizationsQuery.isLoading}
            onSave={handleSaveChurch}
            onDelete={handleDeleteChurch}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['allOrganizations'] })}
            startWithCreate={createOrgOnOpen}
            onBack={() => handleViewChange('churchList')}
          />
        ) : user && currentView === 'accounts' && canManageUsers ? (
          <AccountManager />
        ) : catalogSongsLoading ? (
          <CatalogSongsLoading layout={songsLayout} />
        ) : (
          <div className="w-full space-y-4 sm:space-y-5">
            {user && (
              <PageHeader
                title="Músicas"
                description={`${songs.length} hinos e cânticos no catálogo`}
                actions={
                  canAccessAdminPanel ? (
                    <Button variant="secondary" size="sm" icon={Settings2} onClick={() => handleViewChange('admin')}>
                      Gerenciar
                    </Button>
                  ) : undefined
                }
              />
            )}
            {user && (
              <div className="sticky top-[calc(60px+env(safe-area-inset-top,0px))] lg:top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2 bg-app/90 backdrop-blur-md">
                <CatalogSearchBar
                  value={quickQuery}
                  onChange={handleQuickQueryChange}
                  onOpenKeypad={() => setShowKeypad(true)}
                  onOpenAdvancedSearch={() => setShowAdvancedSearch(true)}
                  showFavoritesOnly={showFavoritesOnly}
                  onToggleFavoritesOnly={() => void handleToggleFavoritesOnly()}
                />
              </div>
            )}
            <div className="flex flex-col gap-3 ui-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl">
              {categories.length > 0 && (
                <div
                  className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 sm:flex-wrap sm:overflow-visible"
                  role="group"
                  aria-label="Categorias"
                >
                  <button
                    type="button"
                    onClick={() => setActiveCategoryPill('Todos')}
                    aria-pressed={activeCategoryPill === 'Todos'}
                    className={cn(
                      'shrink-0 min-h-9 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border touch-manipulation',
                      activeCategoryPill === 'Todos'
                        ? 'bg-brand text-brand-fg border-transparent font-bold shadow-sm'
                        : 'bg-muted text-fg-muted border-transparent hover:bg-muted-hover hover:text-fg',
                    )}
                  >
                    Todas
                    <span className="ml-1 opacity-70 tabular-nums">{songs.length}</span>
                  </button>
                  {categories.map((cat) => {
                    const count = songs.filter((h) => h.category === cat.name).length;
                    const isSelected = activeCategoryPill === cat.name;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryPill(isSelected ? 'Todos' : cat.name)}
                        aria-pressed={isSelected}
                        className={cn(
                          'shrink-0 min-h-9 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border touch-manipulation',
                          isSelected
                            ? 'bg-brand text-brand-fg border-transparent font-bold shadow-sm'
                            : 'bg-muted text-fg-muted border-transparent hover:bg-muted-hover hover:text-fg',
                        )}
                      >
                        {cat.name}
                        <span className="ml-1 opacity-70 tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 min-w-0 text-xs text-fg-muted">
                <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto overscroll-x-contain scrollbar-none">
                  <div
                    className="flex items-center shrink-0 bg-muted border border-line rounded-xl p-0.5"
                    role="group"
                    aria-label="Modo de visualização"
                  >
                    {(
                      [
                        { mode: 'cards', label: 'Cards', Icon: LayoutGrid },
                        { mode: 'list', label: 'Lista', Icon: List },
                      ] as const
                    ).map(({ mode, label, Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleSongsLayoutChange(mode)}
                        aria-label={`Visualização em ${label.toLowerCase()}`}
                        aria-pressed={songsLayout === mode}
                        title={`Visualização em ${label.toLowerCase()}`}
                        className={cn(
                          'flex items-center justify-center gap-1.5 min-h-8 min-w-9 sm:min-w-0 px-2 sm:px-2.5 rounded-lg font-semibold transition-all touch-manipulation',
                          songsLayout === mode
                            ? 'bg-surface text-fg shadow-sm'
                            : 'text-fg-subtle hover:text-fg',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                  <SongTypeFilter
                    showHinos={showHinos}
                    showCanticos={showCanticos}
                    onToggleHinos={handleToggleHinos}
                    onToggleCanticos={handleToggleCanticos}
                  />
                  <AlphabetFilterToggle
                    expanded={alphabetExpanded}
                    onToggle={() => setAlphabetExpanded((v) => !v)}
                    selectedLetter={selectedLetter}
                  />
                </div>

                <label className="flex items-center gap-1.5 shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <span className="hidden md:inline shrink-0 font-medium">Ordem</span>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'number' | 'title' | 'recent')}
                    aria-label="Ordenação"
                    className="min-h-9 !py-1 !text-xs w-auto max-w-[7.5rem] sm:max-w-none"
                  >
                    <option value="number">Por número</option>
                    <option value="title">Por título</option>
                    <option value="recent">Mais recentes</option>
                  </Select>
                </label>
              </div>

              <AlphabetFilter
                expanded={alphabetExpanded}
                onExpandedChange={setAlphabetExpanded}
                selectedLetter={selectedLetter}
                onSelectLetter={(letter) => {
                  setSelectedLetter(letter);
                  if (letter !== 'TODAS' && sortBy === 'number') setSortBy('title');
                }}
                songs={songs.filter(
                  (h) =>
                    (activeCategoryPill === 'Todos' || h.category === activeCategoryPill) &&
                    matchesSongTypeFilter(h, showHinos, showCanticos),
                )}
              />

              <AppliedAdvancedFiltersBar
                filters={advancedFilters}
                resultCount={sortedSongs.length}
                onUpdateFilters={setAdvancedFilters}
                onClearAll={() => setAdvancedFilters(INITIAL_FILTERS)}
                onEdit={() => setShowAdvancedSearch(true)}
              />
            </div>

            {favoritesFilterLoading ? (
              <CatalogSongsLoading
                layout={songsLayout}
                title={showFavoritesOnly ? 'Carregando favoritos…' : 'Atualizando catálogo…'}
                subtitle={
                  showFavoritesOnly
                    ? 'Filtrando suas músicas favoritas'
                    : 'Removendo o filtro de favoritos'
                }
              />
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
            ) : songs.length === 0 ? (
              <EmptyState
                icon={Music}
                title="Catálogo vazio"
                description={
                  canManageSongs
                    ? 'Nenhuma música cadastrada ainda. Cadastre a primeira música ou importe um arquivo JSON no painel de músicas.'
                    : 'Nenhuma música disponível no momento. Fale com o administrador da sua igreja.'
                }
                action={
                  canManageSongs ? (
                    <Button icon={Music} onClick={() => setSongToEdit('new')}>
                      Cadastrar música
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="Nenhuma música encontrada"
                description={
                  quickQuery.trim()
                    ? `Não encontramos resultados para “${quickQuery.trim()}”. Verifique a grafia ou tente buscar pelo número ou por um trecho da letra.`
                    : 'Não encontramos músicas com os filtros selecionados. Remova alguns filtros para ampliar a busca.'
                }
                action={
                  <Button
                    variant="secondary"
                    icon={FilterX}
                    onClick={() => {
                      setActiveCategoryPill('Todos');
                      setShowFavoritesOnly(false);
                      setQuickQuery('');
                      setSelectedLetter('TODAS');
                      setShowHinos(true);
                      setShowCanticos(true);
                      setAdvancedFilters(INITIAL_FILTERS);
                    }}
                  >
                    Limpar filtros
                  </Button>
                }
              />
            )}
          </div>
        )}
      </main>
      </div>
      )}

      {showMobileNav && (
        <MobileNav
          currentView={currentView}
          onViewChange={handleViewChange}
          hidden={Boolean(projectionSongs)}
        />
      )}

      {activeSongRouteId &&
        (selectedEventSongId
          ? selectedSongVersionQuery.isError
          : selectedSongQuery.isError) && (
        <div className="fixed inset-0 z-50 bg-app flex items-center justify-center px-6">
          <EmptyState
            tone="danger"
            icon={AlertCircle}
            title={selectedEventSongId ? 'Versão não encontrada' : 'Música não encontrada'}
            description={
              (
                (selectedEventSongId
                  ? selectedSongVersionQuery.error
                  : selectedSongQuery.error) as Error
              )?.message || 'Este link pode estar inválido ou a música não está disponível.'
            }
            action={
              <Button variant="secondary" onClick={closeSongPage}>
                Voltar ao catálogo
              </Button>
            }
            className="w-full max-w-md"
          />
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
          onApplyFilters={(next) => {
            setAdvancedFilters(next);
            goToCatalog();
          }}
          onResetFilters={() => {
            setAdvancedFilters(INITIAL_FILTERS);
            goToCatalog();
          }}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      {showLogin && (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onGoToRegister={() => {
            setShowLogin(false);
            setCurrentView('register');
          }}
        />
      )}

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
