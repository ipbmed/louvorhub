import React from 'react';
import { Loader2, Music } from 'lucide-react';

export type SongsLayoutMode = 'cards' | 'list';

interface CatalogSongsLoadingProps {
  layout?: SongsLayoutMode;
  title?: string;
  subtitle?: string;
}

/**
 * Loading do catálogo em tela cheia útil —
 * no mobile fica centralizado na área visível (sem ficar sob os filtros).
 */
export const CatalogSongsLoading: React.FC<CatalogSongsLoadingProps> = ({
  layout = 'cards',
  title = 'Carregando músicas…',
  subtitle,
}) => {
  const defaultSubtitle =
    layout === 'list' ? 'Preparando a listagem' : 'Preparando o catálogo';

  return (
    <div
      className="w-full min-h-[min(70dvh,32rem)] flex flex-col items-center justify-center gap-4 py-12 px-4 bg-stone-900/50 light:bg-stone-50 border border-stone-800 light:border-stone-200 rounded-2xl sm:rounded-3xl"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 flex items-center justify-center">
        <Music className="w-6 h-6 text-emerald-400 light:text-emerald-600" />
      </div>
      <Loader2 className="w-8 h-8 text-emerald-400 light:text-emerald-600 animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-stone-100 light:text-stone-900">{title}</p>
        <p className="text-[11px] text-stone-500">{subtitle ?? defaultSubtitle}</p>
      </div>
    </div>
  );
};
