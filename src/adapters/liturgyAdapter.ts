import type { DbLiturgy, DbLiturgyItem } from '@/lib/dbTypes';
import type { Liturgy, LiturgyItem, LiturgyItemType } from '@/types';

const UI_TYPES: LiturgyItemType[] = [
  'hymn',
  'prayer',
  'reading',
  'praise',
  'sermon',
  'offertory',
  'supper',
  'announcements',
  'benediction',
  'custom',
];

export function toUiLiturgyType(kind: string | null | undefined, fallback: string): LiturgyItemType {
  const raw = (kind || fallback || 'custom').toLowerCase();
  if (raw === 'song') return 'hymn';
  if (raw === 'announcement') return 'announcements';
  if (raw === 'other') return 'custom';
  if (UI_TYPES.includes(raw as LiturgyItemType)) return raw as LiturgyItemType;
  return 'custom';
}

export function toDbLiturgyItemType(type: LiturgyItemType): string {
  switch (type) {
    case 'hymn':
      return 'song';
    case 'announcements':
      return 'announcement';
    case 'praise':
    case 'sermon':
    case 'offertory':
    case 'supper':
    case 'benediction':
    case 'custom':
      return 'other';
    case 'prayer':
      return 'prayer';
    case 'reading':
      return 'reading';
    default:
      return 'other';
  }
}

function dbItemToUi(item: DbLiturgyItem): LiturgyItem {
  return {
    id: item.id,
    order: item.sort_order,
    type: toUiLiturgyType(item.item_kind, item.item_type),
    title: item.title,
    responsible: item.responsible ?? undefined,
    details: item.body ?? undefined,
    duration: item.duration ?? undefined,
    songId: item.song_id ?? undefined,
  };
}

export function dbLiturgyToUi(row: DbLiturgy): Liturgy {
  return {
    id: row.id,
    churchId: row.org_id,
    eventId: row.event_id ?? undefined,
    date: row.service_date || '',
    serviceTitle: row.title,
    theme: row.theme ?? undefined,
    bibleVerse: row.bible_verse ?? undefined,
    preacher: row.preacher ?? undefined,
    leader: row.leader ?? undefined,
    items: [...(row.liturgy_items || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(dbItemToUi),
    createdAt: row.created_at,
  };
}
