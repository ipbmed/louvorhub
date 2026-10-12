import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';
import { cn } from './ui/cn';

interface ThemeToggleProps {
  className?: string;
  /** Só ícone (sem rótulo). */
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Ativar tema claro' : 'Ativar tema escuro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-button border border-line bg-muted/70 text-fg-muted hover:text-fg hover:bg-muted-hover transition-colors touch-manipulation',
        compact ? 'w-10 h-10' : 'min-h-10 px-3 text-xs font-semibold',
        className,
      )}
      title={label}
      aria-label={label}
    >
      {isDark ? (
        <Sun className="w-[18px] h-[18px] text-amber-300" />
      ) : (
        <Moon className="w-[18px] h-[18px] text-emerald-700" />
      )}
      {!compact && <span className="hidden sm:inline">{isDark ? 'Claro' : 'Escuro'}</span>}
    </button>
  );
};
