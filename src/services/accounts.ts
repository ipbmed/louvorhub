import { requireSupabase } from '@/lib/supabase';
import type { AccountStatus, RegisteredUser } from '@/types';

export async function registerAccount(name: string, email: string): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('register_user_account', {
    p_name: name.trim(),
    p_email: email.trim().toLowerCase(),
  });

  if (error) {
    const msg = error.message || '';
    if (/register_user_account|function.*does not exist|account_status/i.test(msg)) {
      throw new Error(
        'Cadastro indisponível: aplique as migrations do Supabase (supabase db push) e tente novamente.',
      );
    }
    throw new Error(msg || 'Não foi possível enviar o cadastro.');
  }

  const payload = (data || {}) as { ok?: boolean; message?: string };
  return payload.message || 'Cadastro enviado! Aguarde aprovação do administrador.';
}

export async function listRegisteredUsers(status?: AccountStatus): Promise<RegisteredUser[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('list_registered_users', {
    p_status: status ?? null,
  });
  if (error) throw error;
  return ((data || []) as RegisteredUser[]).map((row) => ({
    ...row,
    name: row.display_name,
    status: row.account_status,
    avatar_path: row.avatar_path ?? null,
    birth_date: row.birth_date ?? null,
    skills: row.skills ?? [],
  }));
}

export async function approveUserAccount(userId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('approve_user_account', { p_user_id: userId });
  if (error) throw error;
}

export async function rejectUserAccount(userId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('reject_user_account', { p_user_id: userId });
  if (error) throw error;
}

export async function adminCreateUser(input: {
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  skills?: string[];
  churchId?: string;
  isAdmin?: boolean;
}): Promise<string> {
  const sb = requireSupabase();
  const skills = (input.skills || []).map((s) => s.trim()).filter(Boolean);
  const { data, error } = await sb.rpc('admin_create_user', {
    p_name: input.name.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_phone: input.phone?.trim() || null,
    p_birth_date: input.birthDate?.trim() || null,
    p_skills: skills,
    p_church_id: input.churchId?.trim() || null,
    p_is_admin: Boolean(input.isAdmin),
  });
  if (error) throw error;
  if (!data || typeof data !== 'string') {
    throw new Error('Cadastro não retornou o usuário.');
  }
  return data;
}

export async function adminUpdateUser(input: {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin?: boolean;
  accountStatus?: AccountStatus;
  birthDate?: string | null;
  skills?: string[];
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('admin_update_user_account', {
    p_user_id: input.userId,
    p_name: input.name.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_phone: input.phone?.trim() || null,
    p_is_admin: Boolean(input.isAdmin),
    p_account_status: input.accountStatus ?? null,
    p_birth_date: input.birthDate?.trim() || null,
    p_skills: input.skills ?? [],
  });
  if (error) throw error;
}

export async function adminSetUserAvatar(
  userId: string,
  avatarPath: string | null,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('admin_set_user_avatar', {
    p_user_id: userId,
    p_avatar_path: avatarPath,
  });
  if (error) throw error;
}

export async function adminUploadUserAvatar(
  userId: string,
  blob: Blob,
): Promise<string> {
  const sb = requireSupabase();
  const path = `${userId}/avatar.jpg`;
  const { error: uploadErr } = await sb.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (uploadErr) throw uploadErr;
  await adminSetUserAvatar(userId, path);
  return path;
}

export async function adminRemoveUserAvatar(
  userId: string,
  currentPath?: string | null,
): Promise<void> {
  const sb = requireSupabase();
  if (currentPath) {
    await sb.storage.from('avatars').remove([currentPath]);
  }
  await adminSetUserAvatar(userId, null);
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('admin_delete_user_account', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function lookupRegisteredUser(email: string): Promise<RegisteredUser | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('lookup_registered_user', {
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    ...row,
    name: row.display_name,
    status: row.account_status,
  } as RegisteredUser;
}

export async function getMyAccountStatus(userId: string): Promise<AccountStatus | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('account_status')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.account_status as AccountStatus | undefined) ?? null;
}
