import type { DbGroup, DbGroupMember } from '@/lib/dbTypes';
import type { MusicGroup, MusicGroupMember } from '@/types';

export function dbMemberToMusicGroupMember(m: DbGroupMember): MusicGroupMember {
  return {
    id: m.id,
    userId: m.user_id,
    name: m.profiles?.display_name || 'Integrante',
    isLeader: Boolean(m.is_leader),
  };
}

export function dbGroupToMusicGroup(g: DbGroup): MusicGroup {
  const members = (g.group_members || []).map(dbMemberToMusicGroupMember);
  const leaderName = members
    .filter((m) => m.isLeader)
    .map((m) => m.name)
    .join(', ');
  return {
    id: g.id,
    churchId: g.org_id,
    name: g.name,
    description: g.description ?? undefined,
    leaderName: leaderName || undefined,
    members,
    createdAt: g.created_at,
  };
}
