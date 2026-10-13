import React, { useState } from 'react';
import { Check, FileText } from 'lucide-react';
import type { LiturgyItem, LiturgyItemType } from '@/types';
import type { AssistantLiturgyItem } from '@/services/assistant';
import { useConfirm } from '@/contexts/ConfirmProvider';
import { ActionButton } from '../ui';
import { songBadge } from './SongProposal';

const TYPE_ICON: Record<LiturgyItemType, string> = {
  hymn: '🎵',
  prayer: '🙏',
  reading: '📖',
  praise: '🎵',
  sermon: '✝️',
  offertory: '💸',
  supper: '🍷',
  announcements: '📢',
  benediction: '🕊️',
  custom: '📌',
};

export function toLiturgyItems(items: AssistantLiturgyItem[]): LiturgyItem[] {
  const stamp = Date.now();
  return items.map((it, i) => ({
    id: `li-${stamp}-${i}`,
    order: i + 1,
    type: it.type,
    title: it.title,
    details: it.details,
    responsible: it.responsible,
    duration: it.duration,
    songId: it.type === 'hymn' ? it.songId : undefined,
  }));
}

interface LiturgyProposalProps {
  items: AssistantLiturgyItem[];
  currentCount: number;
  canApply: boolean;
  onApply: (items: LiturgyItem[]) => Promise<void>;
}

export const LiturgyProposal: React.FC<LiturgyProposalProps> = ({ items, currentCount, canApply, onApply }) => {
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (currentCount > 0) {
      const ok = await confirm({
        title: 'Substituir liturgia',
        message: `Os ${currentCount} momentos atuais serão substituídos pela proposta do assistente. As músicas da proposta também entram no repertório.`,
        confirmLabel: 'Substituir',
        tone: 'warning',
      });
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      await onApply(toLiturgyItems(items));
      setApplied(true);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível aplicar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <ol className="divide-y divide-line">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5 px-3 py-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-brand-soft text-brand-text text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">
                <span className="mr-1">{TYPE_ICON[it.type] ?? '📌'}</span>
                {it.title}
                {it.duration && <span className="ml-1.5 font-normal text-fg-subtle">· {it.duration}</span>}
              </p>
              {it.songTitle && (
                <p className="mt-0.5 text-brand-text">
                  <span className="font-mono mr-1">{songBadge(it.songKind, it.songNumber)}</span>
                  {it.songTitle}
                </p>
              )}
              {it.details && <p className="mt-0.5 text-fg-muted leading-snug">{it.details}</p>}
              {it.responsible && <p className="mt-0.5 text-fg-subtle">Responsável: {it.responsible}</p>}
            </div>
          </li>
        ))}
      </ol>
      {canApply && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-line bg-surface-2">
          {error && <p className="text-xs text-danger-text flex-1">{error}</p>}
          <ActionButton
            variant={applied ? 'light' : 'primary'}
            icon={applied ? Check : FileText}
            loading={saving}
            disabled={applied}
            onClick={() => void apply()}
          >
            {applied ? 'Aplicada' : 'Aplicar à liturgia'}
          </ActionButton>
        </div>
      )}
    </div>
  );
};
