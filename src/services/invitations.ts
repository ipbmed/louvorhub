import type { OrgInvitation } from '@/types';
import { requireSupabase } from '@/lib/supabase';

type InvitationRow = {
  id: string;
  org_id: string;
  email: string;
  display_name: string | null;
  token: string;
  status: OrgInvitation['status'];
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
};

function mapInvitation(row: InvitationRow): OrgInvitation {
  return {
    id: row.id,
    orgId: row.org_id,
    email: row.email,
    displayName: row.display_name,
    token: row.token,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedUserId: row.accepted_user_id,
  };
}

export function inviteAcceptUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/convite/${token}`;
}

export async function createOrgInvitation(input: {
  orgId: string;
  email: string;
  displayName?: string;
}): Promise<OrgInvitation> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('create_org_invitation', {
    p_org_id: input.orgId,
    p_email: input.email.trim().toLowerCase(),
    p_display_name: input.displayName?.trim() || null,
  });
  if (error) throw new Error(error.message || 'Não foi possível criar o convite.');
  return mapInvitation(data as InvitationRow);
}

export async function listOrgInvitations(orgId: string): Promise<OrgInvitation[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('list_org_invitations', { p_org_id: orgId });
  if (error) throw new Error(error.message || 'Não foi possível listar convites.');
  return ((data || []) as InvitationRow[]).map(mapInvitation);
}

export async function revokeOrgInvitation(invitationId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('revoke_org_invitation', { p_invitation_id: invitationId });
  if (error) throw new Error(error.message || 'Não foi possível cancelar o convite.');
}

export type PublicOrgInvitation = {
  orgId: string;
  orgName: string;
  email: string;
  displayName: string | null;
  status: OrgInvitation['status'];
  expiresAt: string;
};

export async function getOrgInvitationPublic(token: string): Promise<PublicOrgInvitation | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('get_org_invitation_public', { p_token: token.trim() });
  if (error) throw new Error(error.message || 'Convite inválido.');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    orgId: row.org_id,
    orgName: row.org_name,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

export async function acceptOrgInvitation(token: string): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('accept_org_invitation', { p_token: token.trim() });
  if (error) throw new Error(error.message || 'Não foi possível aceitar o convite.');
  if (!data || typeof data !== 'string') {
    throw new Error('Aceite do convite não retornou a igreja.');
  }
  return data;
}

/** Aceita convite sem sessão: cria conta aprovada (se preciso), associa e envia magic link. */
export async function acceptOrgInvitationAsGuest(input: {
  token: string;
  name: string;
}): Promise<{ message: string; alreadyMember?: boolean }> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke('accept-org-invite', {
    body: {
      token: input.token.trim(),
      name: input.name.trim(),
    },
  });
  if (error) {
    throw new Error(error.message || 'Não foi possível aceitar o convite.');
  }
  const payload = (data || {}) as { error?: string; message?: string; alreadyMember?: boolean; ok?: boolean };
  if (payload.error) throw new Error(payload.error);
  return {
    message: payload.message || 'Convite aceito. Verifique seu e-mail para entrar.',
    alreadyMember: payload.alreadyMember,
  };
}
