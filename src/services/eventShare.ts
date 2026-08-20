import { isUuid } from '@/lib/ids';
import { normalizeShareSlug, validateShareSlug } from '@/lib/shareSlug';
import { requireSupabase } from '@/lib/supabase';
import type { Song } from '@/types';

export interface EventShareFlags {
  includeSongs: boolean;
  includeLiturgy: boolean;
  includeTeam: boolean;
}

export interface PublicEventShareMeta {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  theme?: string | null;
  shareCode: string;
  flags: EventShareFlags;
}

export interface PublicEventSong extends Song {
  eventSongId: string;
  hasVersion?: boolean;
  sortOrder: number;
}

export interface PublicEventLiturgyItem {
  id: string;
  itemType: string;
  itemKind?: string | null;
  title: string;
  body?: string | null;
  songId?: string | null;
  sortOrder: number;
  responsible?: string | null;
  duration?: string | null;
}

export interface PublicEventLiturgy {
  id: string;
  title: string;
  theme?: string | null;
  bibleVerse?: string | null;
  preacher?: string | null;
  leader?: string | null;
  notes?: string | null;
  items: PublicEventLiturgyItem[];
}

export interface PublicEventTeamMember {
  id: string;
  roleLabel: string;
  personName?: string | null;
  sortOrder: number;
  availabilityStatus?: string | null;
}

export interface PublicEventShare {
  event: PublicEventShareMeta;
  songs: PublicEventSong[] | null;
  liturgy: PublicEventLiturgy | null;
  team: PublicEventTeamMember[] | null;
}

export interface EventShareSettings {
  enabled: boolean;
  includeSongs: boolean;
  includeLiturgy: boolean;
  includeTeam: boolean;
  /** Slug do link; se omitido, mantém o atual */
  shareCode?: string;
  /** ISO datetime ou null para remover validade */
  expiresAt?: string | null;
}

export interface PublicSharedEventSummary {
  title: string;
  date: string;
  time?: string | null;
  theme?: string | null;
  shareCode: string;
  shareExpiresAt?: string | null;
  orgId?: string;
}

export interface PublicSharedOrgSummary {
  id: string;
  name: string;
  sigla?: string | null;
  city?: string | null;
}

type RpcSongRow = {
  event_song_id: string;
  song_id: string;
  sort_order: number;
  title: string;
  subtitle?: string | null;
  kind?: string | null;
  number?: number | null;
  hymnal?: string | null;
  lyrics_md?: string | null;
  musical_key?: string | null;
  bpm?: number | null;
  time_signature?: string | null;
  instructions?: string | null;
  has_version?: boolean;
};

type RpcLiturgyItemRow = {
  id: string;
  item_type: string;
  item_kind?: string | null;
  title: string;
  body?: string | null;
  song_id?: string | null;
  sort_order: number;
  responsible?: string | null;
  duration?: string | null;
};

type RpcLiturgyRow = {
  id: string;
  title: string;
  theme?: string | null;
  bible_verse?: string | null;
  preacher?: string | null;
  leader?: string | null;
  notes?: string | null;
  items?: RpcLiturgyItemRow[] | null;
};

type RpcTeamRow = {
  id: string;
  role_label: string;
  person_name?: string | null;
  sort_order: number;
  availability_status?: string | null;
};

type RpcPayload = {
  event: {
    id: string;
    title: string;
    date: string;
    time?: string | null;
    theme?: string | null;
    share_code: string;
    share_expires_at?: string | null;
    share_include_songs?: boolean;
    share_include_liturgy?: boolean;
    share_include_team?: boolean;
  };
  songs?: RpcSongRow[] | null;
  liturgy?: RpcLiturgyRow | null;
  team?: RpcTeamRow[] | null;
};

export function eventShareUrl(shareCode: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/+$/, '');
  return `${base}/evento/${shareCode}`;
}

function mapSong(row: RpcSongRow): PublicEventSong {
  const kind = row.kind === 'hino' || row.number != null ? 'hino' : 'cantico';
  const now = new Date().toISOString();
  return {
    id: row.song_id,
    eventSongId: row.event_song_id,
    sortOrder: row.sort_order,
    hasVersion: Boolean(row.has_version),
    songType: kind,
    number: row.number ?? null,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    hymnal: row.hymnal ?? undefined,
    lyrics: row.lyrics_md || '',
    category: '',
    tags: [],
    originalKey: row.musical_key ?? undefined,
    bpm: row.bpm ?? null,
    timeSignature: row.time_signature ?? undefined,
    instructions: row.instructions ?? undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function mapLiturgy(row: RpcLiturgyRow | null | undefined): PublicEventLiturgy | null {
  if (!row?.id) return null;
  const items = [...(row.items || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id,
      itemType: item.item_type,
      itemKind: item.item_kind,
      title: item.title,
      body: item.body,
      songId: item.song_id,
      sortOrder: item.sort_order,
      responsible: item.responsible,
      duration: item.duration,
    }));
  return {
    id: row.id,
    title: row.title,
    theme: row.theme,
    bibleVerse: row.bible_verse,
    preacher: row.preacher,
    leader: row.leader,
    notes: row.notes,
    items,
  };
}

/** Carrega evento público por share_code (anon OK via RPC). */
export async function getPublicEvent(shareCode: string): Promise<PublicEventShare | null> {
  const code = shareCode.trim();
  if (!code) return null;
  const sb = requireSupabase();
  let data: unknown = null;
  let error: { message?: string; code?: string } | null = null;

  ({ data, error } = await sb.rpc('get_public_event', { p_share_code: code }));
  // Fallback se a migration nova ainda não foi aplicada
  if (error && /get_public_event|PGRST202|42883/i.test(error.message || '')) {
    ({ data, error } = await sb.rpc('get_public_event_repertoire', { p_share_code: code }));
  }
  if (error) throw error;
  if (!data) return null;

  const payload = data as RpcPayload;
  if (!payload?.event?.id) return null;

  const flags: EventShareFlags = {
    includeSongs: payload.event.share_include_songs !== false,
    includeLiturgy: payload.event.share_include_liturgy !== false,
    includeTeam: Boolean(payload.event.share_include_team),
  };

  const songs = flags.includeSongs
    ? [...(payload.songs || [])].sort((a, b) => a.sort_order - b.sort_order).map(mapSong)
    : null;

  const liturgy = flags.includeLiturgy ? mapLiturgy(payload.liturgy) : null;

  const team = flags.includeTeam
    ? [...(payload.team || [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({
          id: row.id,
          roleLabel: row.role_label,
          personName: row.person_name,
          sortOrder: row.sort_order,
          availabilityStatus: row.availability_status,
        }))
    : null;

  return {
    event: {
      id: payload.event.id,
      title: payload.event.title,
      date: payload.event.date,
      time: payload.event.time,
      theme: payload.event.theme,
      shareCode: payload.event.share_code,
      flags,
    },
    songs,
    liturgy,
    team,
  };
}

/** @deprecated use getPublicEvent */
export async function getPublicEventRepertoire(shareCode: string) {
  const data = await getPublicEvent(shareCode);
  if (!data) return null;
  return {
    event: {
      id: data.event.id,
      title: data.event.title,
      date: data.event.date,
      time: data.event.time,
      theme: data.event.theme,
      shareCode: data.event.shareCode,
    },
    songs: data.songs || [],
  };
}

export async function isEventShareCodeAvailable(
  shareCode: string,
  excludeEventId?: string,
): Promise<boolean> {
  const slug = normalizeShareSlug(shareCode);
  const formatError = validateShareSlug(slug);
  if (formatError) return false;
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('is_event_share_code_available', {
    p_share_code: slug,
    p_exclude_event_id: excludeEventId && isUuid(excludeEventId) ? excludeEventId : null,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function updateEventShareSettings(
  eventId: string,
  settings: EventShareSettings,
): Promise<{
  shareCode: string;
  shareEnabled: boolean;
  shareIncludeSongs: boolean;
  shareIncludeLiturgy: boolean;
  shareIncludeTeam: boolean;
  shareExpiresAt: string | null;
}> {
  if (!isUuid(eventId)) throw new Error('Evento inválido.');
  const sb = requireSupabase();

  const payload: Record<string, unknown> = {
    share_enabled: settings.enabled,
    share_include_songs: settings.includeSongs,
    share_include_liturgy: settings.includeLiturgy,
    share_include_team: settings.includeTeam,
    updated_at: new Date().toISOString(),
  };

  if (settings.shareCode !== undefined) {
    const slug = normalizeShareSlug(settings.shareCode);
    const formatError = validateShareSlug(slug);
    if (formatError) throw new Error(formatError);
    const available = await isEventShareCodeAvailable(slug, eventId);
    if (!available) throw new Error('Este nome de link já está em uso. Escolha outro.');
    payload.share_code = slug;
  }

  if (settings.expiresAt !== undefined) {
    payload.share_expires_at = settings.expiresAt;
  }

  if (settings.enabled) {
    const expires =
      settings.expiresAt !== undefined ? settings.expiresAt : undefined;
    if (expires === null || expires === '') {
      throw new Error('A validade do link é obrigatória.');
    }
    // Se está ativando e não enviou expiresAt nesta chamada, exige que já exista no banco
    if (expires === undefined) {
      const { data: current, error: curErr } = await sb
        .from('events')
        .select('share_expires_at')
        .eq('id', eventId)
        .single();
      if (curErr) throw curErr;
      if (!current?.share_expires_at) {
        throw new Error('Defina a validade do link antes de ativar o compartilhamento.');
      }
    }
  }

  const { data, error } = await sb
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .select(
      'share_code, share_enabled, share_include_songs, share_include_liturgy, share_include_team, share_expires_at',
    )
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('Este nome de link já está em uso. Escolha outro.');
    }
    throw error;
  }
  return {
    shareCode: data.share_code as string,
    shareEnabled: Boolean(data.share_enabled),
    shareIncludeSongs: data.share_include_songs !== false,
    shareIncludeLiturgy: data.share_include_liturgy !== false,
    shareIncludeTeam: Boolean(data.share_include_team),
    shareExpiresAt: (data.share_expires_at as string | null) ?? null,
  };
}

/** Igrejas que têm eventos com link público ativo. */
export async function listPublicSharedOrgs(): Promise<PublicSharedOrgSummary[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('list_public_shared_orgs');
  if (error) throw error;
  const rows = (data || []) as Array<{
    id: string;
    name: string;
    sigla?: string | null;
    city?: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sigla: row.sigla,
    city: row.city,
  }));
}

/** Eventos públicos ativos de uma igreja. */
export async function listPublicSharedEvents(
  orgId: string,
): Promise<PublicSharedEventSummary[]> {
  if (!isUuid(orgId)) return [];
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('list_public_shared_events', {
    p_org_id: orgId,
  });
  if (error) throw error;
  const rows = (data || []) as Array<{
    title: string;
    date: string;
    time?: string | null;
    theme?: string | null;
    share_code: string;
    share_expires_at?: string | null;
    org_id?: string;
  }>;
  return rows.map((row) => ({
    title: row.title,
    date: row.date,
    time: row.time,
    theme: row.theme,
    shareCode: row.share_code,
    shareExpiresAt: row.share_expires_at ?? null,
    orgId: row.org_id,
  }));
}

/** @deprecated use updateEventShareSettings */
export async function setEventShareEnabled(
  eventId: string,
  enabled: boolean,
): Promise<{ shareCode: string; shareEnabled: boolean }> {
  const result = await updateEventShareSettings(eventId, {
    enabled,
    includeSongs: true,
    includeLiturgy: true,
    includeTeam: false,
  });
  return {
    shareCode: result.shareCode,
    shareEnabled: result.shareEnabled,
  };
}
