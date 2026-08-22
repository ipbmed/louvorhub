import { supabase } from '@/lib/supabase';

/** URL pública do avatar com cache-bust opcional (ex.: profile.updated_at). */
export function getAvatarPublicUrl(
  avatarPath: string | null | undefined,
  cacheKey?: string | null,
): string | null {
  if (!avatarPath) return null;
  const base = supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl;
  if (!cacheKey) return base;
  return `${base}?t=${encodeURIComponent(cacheKey)}`;
}
