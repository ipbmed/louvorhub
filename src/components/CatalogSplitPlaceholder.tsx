import React from 'react';
import { Hash, MonitorPlay, Search, SlidersHorizontal } from 'lucide-react';
import { Logo } from './Logo';

interface CatalogSplitPlaceholderProps {
  songsCount: number;
}

const TIPS = [
  { Icon: Search, text: 'Busque pelo título, número ou um trecho da letra' },
  { Icon: Hash, text: 'Use o teclado numérico para abrir um hino pelo número' },
  { Icon: SlidersHorizontal, text: 'Refine por categoria, tom ou autor na busca avançada' },
  { Icon: MonitorPlay, text: 'Abra a letra no telão com um clique' },
];

export const CatalogSplitPlaceholder: React.FC<CatalogSplitPlaceholderProps> = ({ songsCount }) => (
  <div className="h-full flex flex-col items-center justify-center px-10 text-center border-b-[6px] border-brand/70">
    <div className="relative mb-8">
      <div className="absolute inset-0 -m-10 rounded-full bg-brand-soft blur-2xl opacity-80" aria-hidden />
      <Logo size="lg" className="relative flex-col gap-4" />
    </div>
    <h2 className="text-2xl font-light text-fg tracking-tight">Escolha uma música</h2>
    <p className="mt-2 max-w-md text-sm text-fg-muted leading-relaxed">
      Selecione um hino ou cântico na lista ao lado para ver a letra, as cifras e os recursos de leitura.
      São <b className="text-fg font-semibold tabular-nums">{songsCount}</b> músicas no catálogo.
    </p>
    <ul className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-2.5 max-w-xl w-full text-left">
      {TIPS.map(({ Icon, text }) => (
        <li key={text} className="flex items-center gap-3 rounded-2xl bg-surface border border-line/70 px-4 py-3">
          <span className="w-8 h-8 rounded-full bg-brand-soft text-brand-text flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </span>
          <span className="text-xs text-fg-muted leading-snug">{text}</span>
        </li>
      ))}
    </ul>
  </div>
);
