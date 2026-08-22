import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-button text-xs font-medium flex items-center gap-1.5 transition-all border bg-stone-800/80 light:bg-stone-100 text-stone-300 light:text-stone-700 border-stone-700 light:border-stone-300 hover:bg-stone-700/80 light:hover:bg-stone-200 ${className}`}
      title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-emerald-700" />}
      {!compact && <span className="hidden sm:inline font-semibold">{isDark ? 'Claro' : 'Escuro'}</span>}
    </button>
  );
};
