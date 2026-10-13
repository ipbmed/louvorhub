import React, { useState } from 'react';
import { Check, Users } from 'lucide-react';
import type { AssistantAssignment } from '@/services/assistant';
import { useConfirm } from '@/contexts/ConfirmProvider';
import { ActionButton } from '../ui';

interface TeamProposalProps {
  assignments: AssistantAssignment[];
  currentCount: number;
  canApply: boolean;
  onApply: (assignments: AssistantAssignment[]) => Promise<void>;
}

export const TeamProposal: React.FC<TeamProposalProps> = ({ assignments, currentCount, canApply, onApply }) => {
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (currentCount > 0) {
      const ok = await confirm({
        title: 'Substituir escala',
        message: `Os ${currentCount} integrantes escalados serão substituídos pela proposta. Quem permanecer na mesma função mantém a confirmação.`,
        confirmLabel: 'Substituir',
        tone: 'warning',
      });
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      await onApply(assignments);
      setApplied(true);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível aplicar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <ul className="divide-y divide-line">
        {assignments.map((a, i) => (
          <li key={`${a.memberId}-${a.role}-${i}`} className="px-3 py-2 text-xs">
            <p className="flex items-baseline gap-2">
              <span className="font-semibold text-brand-text shrink-0">{a.role}</span>
              <span className="font-semibold text-fg truncate">{a.memberName}</span>
            </p>
            {a.reason && <p className="mt-0.5 text-fg-muted leading-snug">{a.reason}</p>}
          </li>
        ))}
      </ul>
      {canApply && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-line bg-surface-2">
          {error && <p className="text-xs text-danger-text flex-1">{error}</p>}
          <ActionButton
            variant={applied ? 'light' : 'primary'}
            icon={applied ? Check : Users}
            loading={saving}
            disabled={applied}
            onClick={() => void apply()}
          >
            {applied ? 'Aplicada' : 'Aplicar à escala'}
          </ActionButton>
        </div>
      )}
    </div>
  );
};
