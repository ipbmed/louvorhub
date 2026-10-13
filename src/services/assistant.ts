import { requireSupabase } from '@/lib/supabase';
import type { LiturgyItemType, SongType } from '@/types';

export type AssistantMode = 'setlist' | 'catalog' | 'liturgy' | 'schedule';

export interface AssistantSong {
  songId: string;
  title: string;
  kind: SongType;
  number: number | null;
  reason: string;
  /** Última data (YYYY-MM-DD) em que foi tocada na organização, se recente. */
  lastPlayedAt: string | null;
  inRepertoire: boolean;
}

export interface AssistantLiturgyItem {
  type: LiturgyItemType;
  title: string;
  details?: string;
  responsible?: string;
  duration?: string;
  songId?: string;
  songTitle?: string;
  songNumber?: number | null;
  songKind?: SongType;
}

export interface AssistantAssignment {
  memberId: string;
  userId?: string | null;
  memberName: string;
  role: string;
  reason?: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  songs?: AssistantSong[];
  liturgyItems?: AssistantLiturgyItem[];
  assignments?: AssistantAssignment[];
}

export interface AssistantTeamMember {
  id: string;
  userId?: string;
  name: string;
  skills: string[];
}

export interface AssistantRequest {
  mode: AssistantMode;
  messages: AssistantMessage[];
  eventId?: string;
  theme?: string;
  bibleVerse?: string;
  avoidWeeks?: number;
  liturgy?: {
    preacher?: string;
    leader?: string;
    items: Pick<AssistantLiturgyItem, 'type' | 'title' | 'details' | 'songId' | 'responsible' | 'duration'>[];
  };
  team?: {
    members: AssistantTeamMember[];
    roles: string[];
    assignments: { memberId?: string; userId?: string; memberName?: string; role: string }[];
  };
}

export interface AssistantResponse {
  message: string;
  songs?: AssistantSong[];
  liturgyItems?: AssistantLiturgyItem[];
  assignments?: AssistantAssignment[];
}

/** Só o necessário para o servidor reconstruir propostas anteriores na conversa. */
function compactMessage(m: AssistantMessage) {
  return {
    role: m.role,
    content: m.content,
    songs: m.songs?.map((s) => ({ songId: s.songId })),
    liturgyItems: m.liturgyItems?.map(({ type, title, details, songId }) => ({
      type,
      title,
      details,
      songId,
    })),
    assignments: m.assignments?.map(({ memberId, memberName, role }) => ({ memberId, memberName, role })),
  };
}

export async function askAssistant(request: AssistantRequest): Promise<AssistantResponse> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke('assistant', {
    body: { ...request, messages: request.messages.map(compactMessage) },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      const payload = await context.json().catch(() => null);
      if (payload?.error) message = payload.error;
    }
    throw new Error(message || 'Não foi possível consultar o assistente.');
  }

  const res = (data || {}) as AssistantResponse;
  return {
    message: res.message || '',
    songs: Array.isArray(res.songs) ? res.songs : undefined,
    liturgyItems: Array.isArray(res.liturgyItems) ? res.liturgyItems : undefined,
    assignments: Array.isArray(res.assignments) ? res.assignments : undefined,
  };
}
