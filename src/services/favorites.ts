import { requireSupabase } from '@/lib/supabase';

export async function listFavoriteSongIds(userId: string): Promise<string[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('user_favorites').select('song_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((r) => r.song_id as string);
}

export async function toggleFavorite(userId: string, songId: string): Promise<string[]> {
  const sb = requireSupabase();
  const { data: existing } = await sb
    .from('user_favorites')
    .select('song_id')
    .eq('user_id', userId)
    .eq('song_id', songId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('song_id', songId);
    if (error) throw error;
  } else {
    const { error } = await sb.from('user_favorites').insert({ user_id: userId, song_id: songId });
    if (error) throw error;
  }

  return listFavoriteSongIds(userId);
}
