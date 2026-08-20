import { dbGroupToMusicGroup } from '@/adapters/musicGroupAdapter';
import { isUuid } from '@/lib/ids';
import type { DbGroup } from '@/lib/dbTypes';
import { requireSupabase } from '@/lib/supabase';
import type { MusicGroup, MusicGroupMember } from '@/types';

const GROUP_SELECT = `*, group_members(*, profiles(*))`;

export async function listMusicGroups(orgId: string): Promise<MusicGroup[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('groups')
    .select(GROUP_SELECT)
    .eq('org_id', orgId)
    .order('name');
  if (error) throw error;
  return ((data || []) as DbGroup[]).map(dbGroupToMusicGroup);
}

export async function listMusicGroupsForOrgs(orgIds: string[]): Promise<MusicGroup[]> {
  if (!orgIds.length) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('groups')
    .select(GROUP_SELECT)
    .in('org_id', orgIds)
    .order('name');
  if (error) throw error;
  return ((data || []) as DbGroup[]).map(dbGroupToMusicGroup);
}

async function syncMembers(groupId: string, members: MusicGroupMember[]): Promise<void> {
  const sb = requireSupabase();
  await sb.from('group_members').delete().eq('group_id', groupId);

  const linked = members.filter((m) => Boolean(m.userId));
  if (!linked.length) return;

  const { error } = await sb.from('group_members').insert(
    linked.map((m) => ({
      group_id: groupId,
      user_id: m.userId,
      is_leader: Boolean(m.isLeader),
    })),
  );
  if (error) throw error;
}

export async function upsertMusicGroup(group: MusicGroup): Promise<MusicGroup> {
  const sb = requireSupabase();
  const payload = {
    org_id: group.churchId,
    name: group.name,
    description: group.description ?? null,
  };

  let groupId = group.id;
  if (isUuid(groupId)) {
    const { error } = await sb.from('groups').update(payload).eq('id', groupId);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from('groups').insert(payload).select('id').single();
    if (error) throw error;
    groupId = data.id;
  }

  await syncMembers(groupId, group.members || []);

  const { data, error } = await sb.from('groups').select(GROUP_SELECT).eq('id', groupId).single();
  if (error) throw error;
  return dbGroupToMusicGroup(data as DbGroup);
}

export async function deleteMusicGroup(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('groups').delete().eq('id', id);
  if (error) throw error;
}
