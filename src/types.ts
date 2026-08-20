export type SongType = 'hino' | 'cantico';

export type MediaLinkType = 'youtube' | 'ytmusic' | 'spotify' | 'other';

export interface MediaLink {
  id: string;
  type: MediaLinkType;
  title?: string;
  url: string;
}

/** Modelo de música do catálogo (tabela songs + song_links). */
export interface Song {
  id: string;
  songType?: SongType;
  hymnalId?: string | null;
  hymnal?: string;
  number?: number | null;
  title: string;
  subtitle?: string;
  lyrics: string;
  /** @deprecated categorias removidas do schema de songs */
  category?: string;
  categoryId?: string | null;
  tags?: string[];
  author?: string;
  /** Mapeia para songs.composition */
  composer?: string;
  composition?: string;
  originalKey?: string;
  timeSignature?: string;
  bpm?: number | null;
  instructions?: string;
  /** Cifra/letra revisada (songs.reviewed) */
  reviewed?: boolean;
  youtubeUrl?: string;
  spotifyUrl?: string;
  otherMediaUrl?: string;
  mediaLinks?: MediaLink[];
  orgId?: string | null;
  slug?: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Item do repertório do evento (tabela event_songs). */
export interface EventSong {
  id: string;
  songId: string;
  eventId: string;
  /** @deprecated use eventId */
  repertoireId?: string;
  sortOrder?: number;
  /** Presente quando há linha em event_songs_version */
  hasVersion?: boolean;
  lyrics?: string;
  originalKey?: string;
  bpm?: number | null;
  timeSignature?: string;
  instructions?: string;
}

/** @deprecated use EventSong */
export type SongVersion = EventSong;

export interface Category {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  color?: string;
  orgId?: string;
}

export interface SetlistItem {
  id: string;
  songId: string;
  customKey?: string;
  notes?: string;
}

export type SetlistVisibility = 'public_link' | 'private';
export type SetlistKind = 'individual' | 'group_schedule';
export type SetlistSharePermission = 'view' | 'edit';

export interface PlaylistShare {
  id?: string;
  userId: string;
  permission: SetlistSharePermission;
  userName?: string;
}

export interface Setlist {
  id: string;
  title: string;
  date: string;
  items: SetlistItem[];
  createdAt: string;
  orgId?: string | null;
  groupId?: string | null;
  eventId?: string | null;
  createdBy?: string | null;
  shareCode?: string;
  /** public_link = público por link; private = só criador/colaboradores/grupo */
  visibility?: SetlistVisibility;
  kind?: SetlistKind;
  shares?: PlaylistShare[];
  /** Permissão efetiva do usuário atual (quando listado) */
  canEdit?: boolean;
  /** Repertórios de grupo podem ser arquivados */
  archived?: boolean;
  archivedAt?: string | null;
}

/** Culto / ocorrência no calendário — pai de escala, liturgia e repertório */
export interface ChurchEvent {
  id: string;
  churchId: string;
  title: string;
  date: string;
  time?: string;
  serviceType?: string;
  theme?: string;
  notes?: string;
  musicGroupId?: string;
  createdAt: string;
  /** Filhos (quando carregados no bundle) */
  scheduleId?: string;
  liturgyId?: string;
  hasSchedule?: boolean;
  hasLiturgy?: boolean;
  /** Há itens em event_songs para este evento */
  hasRepertoire?: boolean;
  /** @deprecated use hasRepertoire */
  hasSetlist?: boolean;
  /** Link público do evento */
  shareCode?: string;
  shareEnabled?: boolean;
  shareIncludeSongs?: boolean;
  shareIncludeLiturgy?: boolean;
  shareIncludeTeam?: boolean;
  /** ISO datetime; null/undefined = sem validade */
  shareExpiresAt?: string | null;
}

/** Limite de playlists pessoais por usuário */
export const MAX_INDIVIDUAL_SETLISTS = 5;

export type GrantRole = 'church_editor' | 'group_editor' | 'liturgo';

export interface ResourceGrant {
  id?: string;
  role: GrantRole;
  orgId?: string;
  groupId?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  mainRole?: string;
  birthDate?: string;
  skills?: string[];
  churchId?: string;
  status: 'active' | 'inactive';
  /** @deprecated use isAdmin + grants */
  isLeader?: boolean;
  isAdmin?: boolean;
  grants?: ResourceGrant[];
  avatarUrl?: string;
  membershipId?: string;
  role?: 'owner' | 'admin' | 'leader' | 'member';
  createdAt: string;
}

export interface Church {
  id: string;
  name: string;
  city: string;
  address?: string;
  leader?: string;
  phone?: string;
  color?: string;
  slug?: string;
  sigla?: string | null;
  inviteCode?: string;
  isGlobal?: boolean;
  createdAt: string;
}

export interface MusicGroupMember {
  id: string;
  userId: string;
  name: string;
  /** Um ou mais integrantes podem ser líderes do grupo */
  isLeader?: boolean;
}

export interface MusicGroup {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  /** Derivado dos membros com isLeader (somente leitura / exibição) */
  leaderName?: string;
  members: MusicGroupMember[];
  createdAt: string;
}

export type MemberAvailabilityStatus = 'pending' | 'confirmed' | 'declined';

export interface ScheduleMemberAssignment {
  id?: string;
  memberId?: string;
  userId?: string;
  role: string;
  memberName: string;
  status?: MemberAvailabilityStatus;
  declineReason?: string;
  updatedAt?: string;
}

export interface ScheduleSongCustomization {
  songId: string;
  /** id de event_songs — presente quando há event_songs_version */
  eventSongId?: string;
  title?: string;
  originalKey?: string;
  bpm?: string;
  timeSignature?: string;
  lyrics?: string;
  notes?: string;
  isCustomized?: boolean;
  updatedAt?: string;
}

export interface WorshipSchedule {
  id: string;
  churchId: string;
  eventId?: string;
  musicGroupId?: string;
  date: string;
  time?: string;
  serviceType: string;
  theme?: string;
  rehearsalDate?: string;
  rehearsalTime?: string;
  assignments: ScheduleMemberAssignment[];
  songIds: string[];
  customSongs?: ScheduleSongCustomization[];
  /** @deprecated repertório vive em event_songs por eventId */
  setlistId?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed';
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  createdAt: string;
}

export type LiturgyItemType =
  | 'hymn'
  | 'prayer'
  | 'reading'
  | 'praise'
  | 'sermon'
  | 'offertory'
  | 'supper'
  | 'announcements'
  | 'benediction'
  | 'custom';

export interface LiturgyItem {
  id: string;
  order: number;
  type: LiturgyItemType;
  title: string;
  responsible?: string;
  details?: string;
  duration?: string;
  songId?: string;
}

export interface Liturgy {
  id: string;
  churchId: string;
  eventId?: string;
  date: string;
  serviceTitle: string;
  theme?: string;
  bibleVerse?: string;
  preacher?: string;
  leader?: string;
  items: LiturgyItem[];
  createdAt: string;
}

export type ViewMode =
  | 'public'
  | 'setlist'
  | 'churches'
  | 'events'
  | 'schedules'
  | 'liturgies'
  | 'users'
  | 'admin'
  | 'profile';
export type ThemeMode = 'light' | 'dark' | 'navy';
