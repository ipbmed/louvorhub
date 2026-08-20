export type MemberRole = 'owner' | 'admin' | 'leader' | 'member';
export type GrantRole = 'church_editor' | 'group_editor' | 'liturgo';
export type SongKind = 'hino' | 'cantico';
export type PlaylistVisibility = 'public_link' | 'org' | 'group' | 'private';
export type PlaylistKind = 'individual' | 'group_schedule';
export type PlaylistSharePermission = 'view' | 'edit';
export type ScheduleStatus = 'pending' | 'confirmed' | 'completed';
export type AvailabilityStatus = 'pending' | 'confirmed' | 'declined';
export type MemberStatus = 'active' | 'inactive';

export interface DbProfile {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  phone: string | null;
  main_role: string | null;
  birth_date?: string | null;
  skills?: string[] | null;
  /** Igreja de afiliação (membro) — opcional */
  church_id?: string | null;
  /** Admin global do sistema */
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbResourceGrant {
  id: string;
  user_id: string;
  role: GrantRole;
  org_id: string | null;
  group_id: string | null;
  created_at?: string;
}

export interface DbOrganization {
  id: string;
  name: string;
  sigla: string | null;
  slug: string;
  logo_path: string | null;
  invite_code: string;
  is_global: boolean;
  settings: Record<string, unknown>;
  city: string | null;
  address: string | null;
  leader: string | null;
  phone: string | null;
  color: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbMembership {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
  status?: MemberStatus;
  organizations?: DbOrganization;
}

export interface DbCategory {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  color: string | null;
  created_at?: string;
}

export interface DbHymnal {
  id: string;
  name: string;
  created_at?: string;
}

export interface DbSong {
  id: string;
  title: string;
  subtitle: string | null;
  kind: SongKind;
  hymnal_id: string | null;
  number: number | null;
  tags: string[];
  lyrics_md: string;
  musical_key: string | null;
  bpm: number | null;
  time_signature: string | null;
  author: string | null;
  composition: string | null;
  instructions: string | null;
  /** Cifra/letra revisada manualmente */
  reviewed: boolean;
  created_at: string;
  updated_at: string;
  song_links?: DbSongLink[];
  hymnals?: DbHymnal | null;
}

export interface DbSongLink {
  id: string;
  song_id: string;
  label: string;
  url: string;
  sort_order: number;
}

/** Item do repertório do evento (lista) */
export interface DbEventSong {
  id: string;
  song_id: string;
  event_id: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  event_songs_version?: DbEventSongVersion | DbEventSongVersion[] | null;
}

/** Versão customizada de um item do repertório */
export interface DbEventSongVersion {
  event_songs_id: string;
  lyrics_md: string;
  instructions: string | null;
  musical_key: string | null;
  bpm: number | null;
  time_signature: string | null;
  created_at?: string;
  updated_at?: string;
}

/** @deprecated use DbEventSong */
export type DbSongVersion = DbEventSong;

export interface DbGroup {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
  group_members?: DbGroupMember[];
}

export interface DbGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  is_leader?: boolean | null;
  created_at?: string;
  profiles?: DbProfile | null;
}

export interface DbPlaylist {
  id: string;
  org_id: string | null;
  group_id: string | null;
  created_by: string | null;
  title: string;
  purpose: string | null;
  visibility: PlaylistVisibility;
  kind?: PlaylistKind;
  share_code: string;
  is_permanent: boolean;
  archived_at?: string | null;
  created_at: string;
  playlist_items?: DbPlaylistItem[];
}

export interface DbEvent {
  id: string;
  org_id: string;
  title: string;
  service_date: string;
  service_time: string | null;
  service_type: string | null;
  theme: string | null;
  notes: string | null;
  group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  share_code?: string;
  share_enabled?: boolean;
  share_include_songs?: boolean;
  share_include_liturgy?: boolean;
  share_include_team?: boolean;
  share_expires_at?: string | null;
  schedules?: {
    id: string;
    playlist_id: string | null;
  }[] | null;
  liturgies?: { id: string }[] | null;
  event_songs?: { id: string }[] | null;
}

export interface DbPlaylistShare {
  id: string;
  playlist_id: string;
  user_id: string;
  permission: PlaylistSharePermission;
  created_at?: string;
  profiles?: { display_name: string | null } | null;
}

export interface DbPlaylistItem {
  id: string;
  playlist_id: string;
  song_id: string;
  sort_order: number;
  override_key: string | null;
  override_bpm: number | null;
  notes: string | null;
  songs?: DbSong;
}

export interface DbSchedule {
  id: string;
  org_id: string;
  event_id?: string | null;
  title: string;
  service_date: string;
  service_time: string | null;
  service_type: string;
  theme: string | null;
  rehearsal_date: string | null;
  rehearsal_time: string | null;
  notes: string | null;
  status: ScheduleStatus;
  is_finalized: boolean;
  finalized_at: string | null;
  finalized_by: string | null;
  playlist_id: string | null;
  group_id: string | null;
  created_at: string;
  schedule_assignments?: DbScheduleAssignment[];
}

export interface DbScheduleAssignment {
  id: string;
  schedule_id: string;
  role_label: string;
  user_id: string | null;
  person_name: string | null;
  sort_order: number;
  availability_status: AvailabilityStatus;
  decline_reason: string | null;
  updated_at?: string;
  profiles?: DbProfile | null;
}

export interface DbLiturgy {
  id: string;
  org_id: string;
  event_id?: string | null;
  title: string;
  service_date: string | null;
  notes: string | null;
  theme: string | null;
  bible_verse: string | null;
  preacher: string | null;
  leader: string | null;
  created_at: string;
  liturgy_items?: DbLiturgyItem[];
}

export interface DbLiturgyItem {
  id: string;
  liturgy_id: string;
  item_type: string;
  item_kind: string | null;
  title: string;
  body: string | null;
  song_id: string | null;
  playlist_id: string | null;
  sort_order: number;
  responsible: string | null;
  duration: string | null;
}
