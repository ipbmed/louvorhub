import React, { useEffect, useState } from 'react';
import { Building2, Church, Edit3, MapPin, Phone, Trash2, User, UsersRound } from 'lucide-react';
import type { Church as ChurchType, ViewMode } from '@/types';
import { PageHeaderButton, PageShell } from './PageHeader';
import { ChurchFormModal, DEFAULT_CHURCH_COLOR } from './ChurchFormModal';
import { ActionButton, EmptyState, Tabs, type TabItem } from './ui';

export const WORKSPACE_VIEWS: ViewMode[] = ['workspace', 'churches', 'users'];

export type ChurchSection = 'churches' | 'users';

interface ChurchWorkspaceProps {
  church: ChurchType;
  /** Aba ativa; `null` quando o usuário não pode gerenciar grupos nem equipe. */
  section: ChurchSection | null;
  canManageGroups: boolean;
  canManageMembers: boolean;
  canEditChurch?: boolean;
  onSaveChurch?: (church: ChurchType) => void | Promise<void>;
  /** Administradores: excluir a igreja (a confirmação fica a cargo do chamador). */
  onDeleteChurch?: (churchId: string) => void | Promise<unknown>;
  onNavigate: (view: ViewMode) => void;
  /** Voltar para a lista de igrejas. */
  onBack: () => void;
  /** Incrementa para abrir o modal de edição a partir de outra tela. */
  editRequestKey?: number;
  groupsCount?: number;
  membersCount?: number;
  /** `pane`: painel direito da tela Igrejas (sem cabeçalho próprio; ações no banner). */
  variant?: 'page' | 'pane';
  children?: React.ReactNode;
}

export const ChurchWorkspace: React.FC<ChurchWorkspaceProps> = ({
  church,
  section,
  canManageGroups,
  canManageMembers,
  canEditChurch = false,
  onSaveChurch,
  onDeleteChurch,
  onNavigate,
  onBack,
  editRequestKey = 0,
  groupsCount,
  membersCount,
  variant = 'page',
  children,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const color = church.color || DEFAULT_CHURCH_COLOR;
  const address = church.address?.trim() || '';
  const leader = church.leader?.trim() || '';
  const phone = church.phone?.trim() || '';

  const tabs: TabItem<ChurchSection>[] = [
    ...(canManageGroups ? [{ id: 'churches' as const, label: 'Grupos', icon: Building2, count: groupsCount }] : []),
    ...(canManageMembers ? [{ id: 'users' as const, label: 'Equipe', icon: UsersRound, count: membersCount }] : []),
  ];

  const openEdit = () => setModalOpen(true);

  useEffect(() => {
    if (!editRequestKey) return;
    if (!canEditChurch || !onSaveChurch) return;
    openEdit();
    // Trigger externo: reabre o modal a cada incremento da chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequestKey]);

  const canEdit = Boolean(canEditChurch && onSaveChurch);
  const mark = church.sigla?.trim().slice(0, 4).toUpperCase();

  const isPane = variant === 'pane';

  const body = (
    <>
      <div
        className="rounded-[22px] p-5 text-white shadow-card-lg relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, black))` }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-base font-extrabold shrink-0">
            {mark || <Church className="w-6 h-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-tight truncate">{church.name}</p>
            {isPane && church.city && (
              <p className="text-sm text-white/85 mt-0.5 inline-flex items-center gap-1.5 mr-3">
                <MapPin className="w-3.5 h-3.5" />
                {church.city}
              </p>
            )}
            {leader && (
              <p className="text-sm text-white/85 mt-0.5 inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {leader}
              </p>
            )}
          </div>
          {isPane && (canEdit || onDeleteChurch) && (
            <div className="flex items-center gap-2 self-start shrink-0">
              {canEdit && (
                <ActionButton variant="glass" icon={Edit3} onClick={openEdit} title="Editar igreja">
                  Editar
                </ActionButton>
              )}
              {onDeleteChurch && (
                <ActionButton
                  variant="glass"
                  icon={Trash2}
                  onClick={() => void onDeleteChurch(church.id)}
                  aria-label="Excluir igreja"
                  title="Excluir igreja"
                />
              )}
            </div>
          )}
        </div>
        {(address || phone) && (
          <div className="relative mt-4 flex flex-col gap-1.5 text-[13px] text-white/90">
            {address && (
              <span className="inline-flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {address}
              </span>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {phone}
              </a>
            )}
          </div>
        )}
      </div>

      {tabs.length > 1 && section && (
        <Tabs ariaLabel="Seções da igreja" value={section} onChange={(v) => onNavigate(v)} tabs={tabs} />
      )}

      <div className="space-y-3">
        {section ? (
          children
        ) : (
          <EmptyState
            compact
            icon={Church}
            title="Nada para gerenciar aqui"
            description="Você participa desta igreja, mas não tem permissão para gerenciar grupos ou equipe. Os eventos ficam na Agenda."
          />
        )}
      </div>

      {canEdit && onSaveChurch && (
        <ChurchFormModal
          open={modalOpen}
          church={church}
          onClose={() => setModalOpen(false)}
          onSave={onSaveChurch}
        />
      )}
    </>
  );

  if (isPane) return <div className="w-full space-y-4 animate-in fade-in duration-300">{body}</div>;

  return (
    <PageShell
      width="narrow"
      icon={Church}
      title={church.name}
      description={
        church.city ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {church.city}
          </span>
        ) : undefined
      }
      onBack={onBack}
      backLabel="Voltar para Igrejas"
      actions={
        canEdit || onDeleteChurch ? (
          <>
            {canEdit && (
              <PageHeaderButton icon={Edit3} onClick={openEdit} title="Editar igreja">
                Editar
              </PageHeaderButton>
            )}
            {onDeleteChurch && (
              <ActionButton
                variant="danger"
                icon={Trash2}
                onClick={() => void onDeleteChurch(church.id)}
                aria-label="Excluir igreja"
                title="Excluir igreja"
                className="sm:h-10 sm:w-10"
              />
            )}
          </>
        ) : undefined
      }
    >
      {body}
    </PageShell>
  );
};
