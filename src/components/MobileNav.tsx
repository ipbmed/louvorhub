import React from 'react';
import type { ViewMode } from '../types';
import { NAV, sectionOf, type NavSection } from './privateNav';
import { cn } from './ui/cn';

interface MobileNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Esconde a barra (ex.: leitura de música / telão). */
  hidden?: boolean;
}

const ITEMS: NavSection[] = ['home', 'agenda', 'songs', 'churches', 'more'];

/** Barra de navegação inferior do ambiente privado (celular/tablet). */
export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onViewChange, hidden = false }) => {
  if (hidden) return null;
  const activeSection = sectionOf(currentView);

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line pb-safe"
    >
      <ul className="grid grid-cols-5 h-[4.25rem]">
        {ITEMS.map((key) => {
          const { view, label, icon: Icon } = NAV[key];
          const active = activeSection === key;
          return (
            <li key={key} className="min-w-0">
              <button
                type="button"
                onClick={() => onViewChange(view)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative w-full h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors touch-manipulation !rounded-none',
                  active ? 'text-brand-text' : 'text-fg-subtle hover:text-fg',
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-brand" />
                )}
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
                <span className="truncate max-w-full">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
