import type { DbMembership, DbProfile, MemberRole, MemberStatus } from '@/lib/dbTypes';
import { isUuid } from '@/lib/ids';
import { requireSupabase } from '@/lib/supabase';
import type { SystemUser } from '@/types';
import { listGrantsForUsers, replaceUserGrants, setProfileAdmin } from '@/services/grants';

export async function listOrgMembers(orgId: string): Promise<SystemUser[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('memberships')
    .select('*, profiles(*)')
    .eq('org_id', orgId);
  if (error) throw error;

  const rows = (data || []) as (DbMembership & { profiles?: DbProfile | null })[];
  const userIds = rows.map((r) => r.user_id);
  const grantsByUser = await listGrantsForUsers(userIds);

  return rows.map((row) => {
    const m = row;
    const p = m.profiles;
    const skills = p?.skills?.length
      ? p.skills
      : p?.main_role
        ? p.main_role.split(/[,;/|]/).map((s) => s.trim()).filter(Boolean)
        : [];
    const status: MemberStatus = m.status === 'inactive' ? 'inactive' : 'active';
    const grants = grantsByUser.get(m.user_id) || [];
    const isAdmin = Boolean(p?.is_admin);
    return {
      id: m.user_id,
      name: p?.display_name || 'Usuário',
      phone: p?.phone ?? undefined,
      mainRole: p?.main_role ?? skills[0] ?? undefined,
      birthDate: p?.birth_date ?? undefined,
      skills,
      churchId: p?.church_id ?? undefined,
      status,
      isAdmin,
      grants,
      isLeader:
        isAdmin ||
        grants.some((g) => g.role === 'church_editor' || g.role === 'group_editor'),
      avatarUrl: p?.avatar_path ?? undefined,
      membershipId: m.id,
      role: m.role,
      createdAt: p?.created_at || new Date().toISOString(),
    };
  });
}

export async function updateMemberRole(
  membershipId: string,
  role: MemberRole,
  status?: MemberStatus,
): Promise<void> {
  const sb = requireSupabase();
  const patch: { role: MemberRole; status?: MemberStatus } = { role };
  if (status) patch.status = status;
  const { error } = await sb.from('memberships').update(patch).eq('id', membershipId);
  if (error) throw error;
}

export async function updateMemberStatus(
  membershipId: string,
  status: MemberStatus,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('memberships').update({ status }).eq('id', membershipId);
  if (error) throw error;
}

export async function updateProfileDetails(
  userId: string,
  patch: {
    display_name?: string;
    phone?: string | null;
    main_role?: string | null;
    birth_date?: string | null;
    skills?: string[];
    church_id?: string | null;
    is_admin?: boolean;
  },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function removeMembership(membershipId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('memberships').delete().eq('id', membershipId);
  if (error) throw error;
}

async function createSystemUser(orgId: string, user: SystemUser): Promise<SystemUser> {
  const sb = requireSupabase();
  const skills = (user.skills || []).map((s) => s.trim()).filter(Boolean);

  const { data: userId, error } = await sb.rpc('create_org_member', {
    p_org_id: orgId,
    p_name: user.name.trim(),
    p_email: user.email?.trim() || null,
    p_phone: user.phone?.trim() || null,
    p_birth_date: user.birthDate?.trim() || null,
    p_skills: skills,
    p_church_id: user.churchId?.trim() || null,
    p_status: user.status === 'inactive' ? 'inactive' : 'active',
    p_is_admin: Boolean(user.isAdmin),
  });

  if (error) throw new Error(error.message || 'Erro ao cadastrar usuário.');
  if (!userId || typeof userId !== 'string') {
    throw new Error('Cadastro não retornou o usuário.');
  }

  if (!user.isAdmin && user.grants?.length) {
    await replaceUserGrants(userId, user.grants);
  }

  const members = await listOrgMembers(orgId);
  const found = members.find((m) => m.id === userId);
  if (!found) throw new Error('Usuário criado, mas não apareceu na lista da igreja.');
  return found;
}

export async function upsertSystemUserAsProfile(
  orgId: string,
  user: SystemUser,
): Promise<SystemUser> {
  const sb = requireSupabase();

  // Novo cadastro: cria auth.users + profile + membership (Edge Function)
  if (!isUuid(user.id)) {
    return createSystemUser(orgId, user);
  }

  const skills = (user.skills || []).map((s) => s.trim()).filter(Boolean);
  await updateProfileDetails(user.id, {
    display_name: user.name,
    phone: user.phone ?? null,
    birth_date: user.birthDate?.trim() || null,
    skills,
    main_role: skills[0] || user.mainRole || null,
    church_id: user.churchId?.trim() || null,
  });

  if (typeof user.isAdmin === 'boolean') {
    await setProfileAdmin(user.id, user.isAdmin);
  }

  if (user.grants) {
    await replaceUserGrants(user.id, user.grants);
  }

  const status: MemberStatus = user.status === 'inactive' ? 'inactive' : 'active';
  const role: MemberRole = user.role || 'member';

  if (user.membershipId) {
    await updateMemberStatus(user.membershipId, status);
    await updateMemberRole(user.membershipId, role, status);
  } else {
    const { error } = await sb.from('memberships').upsert(
      { org_id: orgId, user_id: user.id, role, status },
      { onConflict: 'org_id,user_id' },
    );
    if (error) throw error;
  }

  const members = await listOrgMembers(orgId);
  const found = members.find((m) => m.id === user.id);
  if (!found) throw new Error('Membro não encontrado após salvar');
  return found;
}
