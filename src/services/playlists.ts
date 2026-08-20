import type {
  DbPlaylist,
  DbPlaylistShare,
  PlaylistKind,
  PlaylistVisibility,
} from '@/lib/dbTypes';
import { requireSupabase } from '@/lib/supabase';
import type {
  PlaylistShare,
  Setlist,
  SetlistSharePermission,
  SetlistVisibility,
} from '@/types';
import { MAX_INDIVIDUAL_SETLISTS } from '@/types';
import { isUuid } from '@/lib/ids';

function toAppVisibility(v: PlaylistVisibility): SetlistVisibility {
  return v === 'public_link' ? 'public_link' : 'private';
}

function toSetlist(p: DbPlaylist, opts?: { canEdit?: boolean; shares?: PlaylistShare[] }): Setlist {
  const items = [...(p.playlist_items || [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: p.id,
    title: p.title,
    date: p.purpose || p.created_at.slice(0, 10),
    createdAt: p.created_at,
    orgId: null,
    groupId: null,
    eventId: null,
    createdBy: p.created_by,
    shareCode: p.share_code,
    visibility: toAppVisibility(p.visibility),
    kind: 'individual',
    canEdit: opts?.canEdit,
    shares: opts?.shares,
    archived: Boolean(p.archived_at),
    archivedAt: p.archived_at ?? null,
    items: items.map((item) => ({
      id: item.id,
      songId: item.song_id,
      customKey: item.override_key ?? undefined,
      notes: item.notes ?? undefined,
    })),
  };
}

export function setlistShareUrl(shareCode: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/+$/, '');
  return `${base}/playlist/${shareCode}`;
}

/** Lista playlists do usuário (próprias + compartilhadas). Sem filtro de igreja/grupo. */
export async function listSetlists(userId: string): Promise<Setlist[]> {
  if (!userId) return [];
  const sb = requireSupabase();

  const { data: shareRowsForUser, error: shareLookupError } = await sb
    .from('playlist_shares')
    .select('playlist_id')
    .eq('user_id', userId);
  if (shareLookupError) throw shareLookupError;

  const sharedIds = (shareRowsForUser || [])
    .map((r) => r.playlist_id as string)
    .filter((id) => isUuid(id));

  let query = sb
    .from('playlists')
    .select('*, playlist_items(*)')
    .eq('is_permanent', true)
    .eq('kind', 'individual')
    .order('created_at', { ascending: false });

  if (sharedIds.length) {
    query = query.or(`created_by.eq.${userId},id.in.(${sharedIds.join(',')})`);
  } else {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as DbPlaylist[];
  const ids = rows.map((r) => r.id);

  let sharesByPlaylist = new Map<string, PlaylistShare[]>();
  if (ids.length) {
    const { data: shareRows } = await sb
      .from('playlist_shares')
      .select('*, profiles(display_name)')
      .in('playlist_id', ids);
    sharesByPlaylist = new Map();
    for (const row of (shareRows || []) as DbPlaylistShare[]) {
      const list = sharesByPlaylist.get(row.playlist_id) || [];
      list.push({
        id: row.id,
        userId: row.user_id,
        permission: row.permission,
        userName: row.profiles?.display_name || undefined,
      });
      sharesByPlaylist.set(row.playlist_id, list);
    }
  }

  return rows.map((p) => {
    const shares = sharesByPlaylist.get(p.id) || [];
    const isCreator = p.created_by === userId;
    const hasEditShare = shares.some((s) => s.userId === userId && s.permission === 'edit');
    const canEdit = isCreator || hasEditShare;
    return toSetlist(p, { canEdit, shares });
  });
}

export async function getSetlistByShareCode(shareCode: string): Promise<Setlist | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('playlists')
    .select('*, playlist_items(*)')
    .eq('share_code', shareCode)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toSetlist(data as DbPlaylist, { canEdit: false });
}

/** Salva playlist pessoal do usuário (sem igreja/grupo). */
export async function upsertSetlist(
  userId: string | undefined,
  setlist: Setlist,
): Promise<Setlist> {
  if (!userId) throw new Error('Faça login para salvar a playlist.');
  const sb = requireSupabase();
  const visibility: PlaylistVisibility =
    setlist.visibility === 'public_link' ? 'public_link' : 'private';
  const kind: PlaylistKind = 'individual';

  const payload = {
    org_id: null,
    created_by: userId,
    title: setlist.title,
    purpose: setlist.date || null,
    visibility,
    kind,
    group_id: null,
    is_permanent: true,
  };

  let playlistId = setlist.id;
  const isNew = !playlistId || !isUuid(playlistId);

  if (isNew) {
    const { count, error: countError } = await sb
      .from('playlists')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('kind', 'individual')
      .eq('is_permanent', true);
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_INDIVIDUAL_SETLISTS) {
      throw new Error(
        `Você já possui ${MAX_INDIVIDUAL_SETLISTS} playlists. Exclua uma para criar outra.`,
      );
    }
  }

  if (!isNew) {
    const { error } = await sb.from('playlists').update(payload).eq('id', playlistId);
    if (error) throw error;
  } else {
    const { data, error } = await sb
      .from('playlists')
      .insert(payload)
      .select('id, share_code')
      .single();
    if (error) throw error;
    playlistId = data.id;
  }

  await sb.from('playlist_items').delete().eq('playlist_id', playlistId);
  if (setlist.items?.length) {
    const { error } = await sb.from('playlist_items').insert(
      setlist.items.map((item, index) => ({
        playlist_id: playlistId,
        song_id: item.songId,
        sort_order: index,
        override_key: item.customKey ?? null,
        notes: item.notes ?? null,
      })),
    );
    if (error) throw error;
  }

  if (setlist.shares) {
    await replaceShares(playlistId, setlist.shares);
  }

  const { data, error } = await sb
    .from('playlists')
    .select('*, playlist_items(*)')
    .eq('id', playlistId)
    .single();
  if (error) throw error;
  return toSetlist(data as DbPlaylist, { canEdit: true, shares: setlist.shares });
}

export async function listShares(playlistId: string): Promise<PlaylistShare[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('playlist_shares')
    .select('*, profiles(display_name)')
    .eq('playlist_id', playlistId);
  if (error) throw error;
  return ((data || []) as DbPlaylistShare[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    permission: row.permission,
    userName: row.profiles?.display_name || undefined,
  }));
}

export async function replaceShares(
  playlistId: string,
  shares: PlaylistShare[],
): Promise<PlaylistShare[]> {
  const sb = requireSupabase();
  const { error: delErr } = await sb.from('playlist_shares').delete().eq('playlist_id', playlistId);
  if (delErr) throw delErr;

  const rows = shares
    .filter((s) => s.userId)
    .map((s) => ({
      playlist_id: playlistId,
      user_id: s.userId,
      permission: (s.permission === 'edit' ? 'edit' : 'view') as SetlistSharePermission,
    }));

  if (rows.length) {
    const { error } = await sb.from('playlist_shares').insert(rows);
    if (error) throw error;
  }
  return listShares(playlistId);
}

export async function deleteSetlist(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('playlists').delete().eq('id', id);
  if (error) throw error;
}

export async function setSetlistArchived(id: string, archived: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('playlists')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export function isGroupSetlist(setlist: Pick<Setlist, 'kind' | 'groupId'>): boolean {
  return setlist.kind === 'group_schedule' || Boolean(setlist.groupId);
}
