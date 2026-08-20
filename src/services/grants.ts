import type { DbResourceGrant, GrantRole } from '@/lib/dbTypes';
import { requireSupabase } from '@/lib/supabase';
import type { ResourceGrant } from '@/types';

function toAppGrant(row: DbResourceGrant): ResourceGrant {
  return {
    id: row.id,
    role: row.role,
    orgId: row.org_id ?? undefined,
    groupId: row.group_id ?? undefined,
  };
}

export async function listGrantsForUser(userId: string): Promise<ResourceGrant[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('resource_grants')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return ((data || []) as DbResourceGrant[]).map(toAppGrant);
}

export async function listGrantsForUsers(userIds: string[]): Promise<Map<string, ResourceGrant[]>> {
  const map = new Map<string, ResourceGrant[]>();
  if (!userIds.length) return map;
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('resource_grants')
    .select('*')
    .in('user_id', userIds);
  if (error) throw error;
  for (const row of (data || []) as DbResourceGrant[]) {
    const list = map.get(row.user_id) || [];
    list.push(toAppGrant(row));
    map.set(row.user_id, list);
  }
  return map;
}

export async function listMyGrants(): Promise<ResourceGrant[]> {
  const sb = requireSupabase();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  return listGrantsForUser(uid);
}

export async function replaceUserGrants(
  userId: string,
  grants: ResourceGrant[],
): Promise<ResourceGrant[]> {
  const sb = requireSupabase();

  const { error: delErr } = await sb.from('resource_grants').delete().eq('user_id', userId);
  if (delErr) throw delErr;

  const rows = grants
    .map((g) => {
      if (g.role === 'group_editor') {
        if (!g.groupId) return null;
        return {
          user_id: userId,
          role: g.role as GrantRole,
          org_id: g.orgId || null,
          group_id: g.groupId,
        };
      }
      if (!g.orgId) return null;
      return {
        user_id: userId,
        role: g.role as GrantRole,
        org_id: g.orgId,
        group_id: null as string | null,
      };
    })
    .filter(Boolean);

  if (rows.length) {
    const { error: insErr } = await sb.from('resource_grants').insert(rows);
    if (insErr) throw insErr;
  }

  return listGrantsForUser(userId);
}

export async function setProfileAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('profiles').update({ is_admin: isAdmin }).eq('id', userId);
  if (error) throw error;
}
