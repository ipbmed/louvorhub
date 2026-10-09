import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from './cn';

const AVATAR_COLORS = ['#4f46e5', '#0d9488', '#db2777', '#ea580c', '#7c3aed', '#0284c7', '#16a34a', '#ca8a04'];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  );
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Círculo com foto ou iniciais coloridas (cor estável por nome). */
export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 36, className }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 text-white font-bold select-none',
      className,
    )}
    style={{
      width: size,
      height: size,
      fontSize: Math.max(11, Math.round(size * 0.38)),
      backgroundColor: src ? undefined : colorFor(name),
    }}
    aria-hidden
  >
    {src ? <img key={src} src={src} alt="" className="w-full h-full object-cover" /> : initialsOf(name)}
  </span>
);

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}

/** Abas segmentadas (trilho cinza, aba ativa em destaque). */
export function Tabs<T extends string>({ tabs, value, onChange, className, ariaLabel }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-1 p-1 rounded-[14px] bg-surface-2 overflow-x-auto scrollbar-none', className)}
    >
      {tabs.map(({ id, label, count, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              'flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-3 min-h-10 !rounded-[11px] text-[13px] font-semibold whitespace-nowrap transition-all touch-manipulation',
              active ? 'bg-surface text-brand-text shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            {label}
            {count != null && (
              <span
                className={cn(
                  'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center tabular-nums',
                  active ? 'bg-brand-soft text-brand-text' : 'bg-muted-hover text-fg-muted',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Bolinha colorida antes do texto (ex.: cor da igreja). */
  dotColor?: string;
}

/** Filtro em pílula. */
export const Chip: React.FC<ChipProps> = ({ active, dotColor, className, children, ...rest }) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      'shrink-0 inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-all touch-manipulation whitespace-nowrap',
      active
        ? 'bg-brand text-white border-transparent shadow-sm'
        : 'bg-surface text-fg-muted border-line hover:text-fg hover:border-line-strong',
      className,
    )}
    {...rest}
  >
    {dotColor && (
      <span
        className={cn('w-2 h-2 rounded-full shrink-0', active && 'ring-2 ring-white/70')}
        style={{ backgroundColor: dotColor }}
      />
    )}
    {children}
  </button>
);

interface FabProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

/** Botão flutuante de criação: acima da barra inferior no celular; com texto no desktop. */
export const Fab: React.FC<FabProps> = ({ icon: Icon, label, onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'btn-gradient fixed z-30 right-4 lg:right-8 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px)+1rem)] lg:bottom-8 inline-flex items-center justify-center gap-2 h-14 min-w-14 px-4 lg:px-5 !rounded-[18px] font-bold text-sm shadow-card-lg active:scale-95 transition-transform touch-manipulation',
      className,
    )}
  >
    <Icon className="w-6 h-6 shrink-0" />
    <span className="hidden lg:inline">{label}</span>
  </button>
);

interface SectionTitleProps {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ icon: Icon, title, action, className }) => (
  <div className={cn('flex items-center justify-between gap-2 mb-3', className)}>
    <h2 className="text-lg font-bold text-fg inline-flex items-center gap-2 tracking-tight">
      {Icon && <Icon className="w-5 h-5 text-brand-text" />}
      {title}
    </h2>
    {action}
  </div>
);

interface StatCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  /** Cor de destaque do ícone. */
  color?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, color = '#4f46e5', onClick }) => {
  const content = (
    <>
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[26px] font-extrabold text-fg leading-none tabular-nums">{value}</span>
        <span className="block text-[13px] font-medium text-fg-muted mt-1 leading-tight">{label}</span>
      </span>
    </>
  );
  const cls = 'ui-card p-4 flex flex-col items-start gap-3 text-left w-full';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, '!rounded-2xl hover:-translate-y-0.5 transition-transform')}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
};

/** Cartão com linhas separadas por divisórias (menus e listas). */
export const ListCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('ui-card overflow-hidden divide-y divide-line', className)}>{children}</div>
);

interface ListRowProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  trailing?: React.ReactNode;
}

export const ListRow: React.FC<ListRowProps> = ({ icon: Icon, label, description, onClick, tone = 'default', trailing }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-3.5 text-left !rounded-none transition-colors hover:bg-surface-2 touch-manipulation',
      tone === 'danger' ? 'text-danger-text' : 'text-fg',
    )}
  >
    <span
      className={cn(
        'w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0',
        tone === 'danger' ? 'bg-danger-soft text-danger-text' : 'bg-brand-soft text-brand-text',
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold truncate">{label}</span>
      {description && <span className="block text-xs text-fg-muted truncate mt-0.5">{description}</span>}
    </span>
    {trailing ?? (tone === 'default' && <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />)}
  </button>
);
