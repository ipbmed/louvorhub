import type { DbCategory } from '@/lib/dbTypes';
import { requireSupabase } from '@/lib/supabase';
import type { Category } from '@/types';

function toUi(c: DbCategory): Category {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    iconName: c.icon_name ?? undefined,
    color: c.color ?? undefined,
    orgId: c.org_id,
  };
}

export async function listCategories(orgId: string): Promise<Category[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .eq('org_id', orgId)
    .order('name');
  if (error) throw error;
  return ((data || []) as DbCategory[]).map(toUi);
}

export async function upsertCategory(orgId: string, category: Category): Promise<Category> {
  const sb = requireSupabase();
  const payload = {
    org_id: orgId,
    name: category.name,
    description: category.description ?? null,
    icon_name: category.iconName ?? null,
    color: category.color ?? null,
  };

  if (category.id && !category.id.startsWith('temp-')) {
    const { data, error } = await sb
      .from('categories')
      .update(payload)
      .eq('id', category.id)
      .select('*')
      .single();
    if (error) throw error;
    return toUi(data as DbCategory);
  }

  const { data, error } = await sb.from('categories').insert(payload).select('*').single();
  if (error) throw error;
  return toUi(data as DbCategory);
}

export async function deleteCategory(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function replaceCategories(orgId: string, categories: Category[]): Promise<Category[]> {
  const existing = await listCategories(orgId);
  const keepIds = new Set(categories.filter((c) => c.id && !c.id.startsWith('temp-')).map((c) => c.id));
  for (const old of existing) {
    if (!keepIds.has(old.id)) await deleteCategory(old.id);
  }
  const result: Category[] = [];
  for (const cat of categories) {
    result.push(await upsertCategory(orgId, cat));
  }
  return result;
}
