import { dbOrgToChurch, slugifyOrgName } from '@/adapters/organizationAdapter';
import type { DbOrganization } from '@/lib/dbTypes';
import { requireSupabase } from '@/lib/supabase';
import type { Church } from '@/types';

export async function listOrganizationsForUser(userId: string): Promise<Church[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('memberships')
    .select('organizations(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || [])
    .map((row) => row.organizations as unknown as DbOrganization)
    .filter(Boolean)
    .filter((o) => !o.is_global)
    .map(dbOrgToChurch);
}

export async function listAllVisibleOrganizations(): Promise<Church[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('organizations')
    .select('*')
    .eq('is_global', false)
    .order('name');
  if (error) throw error;
  return ((data || []) as DbOrganization[]).map(dbOrgToChurch);
}

export async function createOrganization(
  userId: string,
  church: Omit<Church, 'id' | 'createdAt'> & { id?: string },
): Promise<Church> {
  const sb = requireSupabase();
  const baseSlug = slugifyOrgName(church.name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await sb
    .from('organizations')
    .insert({
      name: church.name,
      slug,
      sigla: church.sigla ?? null,
      city: church.city || null,
      address: church.address ?? null,
      leader: church.leader ?? null,
      phone: church.phone ?? null,
      color: church.color ?? null,
      is_global: false,
    })
    .select('*')
    .single();
  if (error) throw error;

  const org = data as DbOrganization;
  const { error: memErr } = await sb.from('memberships').insert({
    org_id: org.id,
    user_id: userId,
    role: 'owner',
  });
  if (memErr) throw memErr;

  return dbOrgToChurch(org);
}

export async function updateOrganization(church: Church): Promise<Church> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('organizations')
    .update({
      name: church.name,
      sigla: church.sigla ?? null,
      city: church.city || null,
      address: church.address ?? null,
      leader: church.leader ?? null,
      phone: church.phone ?? null,
      color: church.color ?? null,
    })
    .eq('id', church.id)
    .select('*')
    .single();
  if (error) throw error;
  return dbOrgToChurch(data as DbOrganization);
}

export async function joinOrganizationByInvite(
  userId: string,
  inviteCode: string,
): Promise<Church> {
  const sb = requireSupabase();
  const { data: org, error } = await sb
    .from('organizations')
    .select('*')
    .eq('invite_code', inviteCode.trim())
    .maybeSingle();
  if (error) throw error;
  if (!org) throw new Error('Código de convite inválido');

  const { error: memErr } = await sb.from('memberships').upsert(
    {
      org_id: org.id,
      user_id: userId,
      role: 'member',
    },
    { onConflict: 'org_id,user_id' },
  );
  if (memErr) throw memErr;
  return dbOrgToChurch(org as DbOrganization);
}

export async function deleteOrganization(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('organizations').delete().eq('id', id);
  if (error) throw error;
}
