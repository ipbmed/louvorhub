import { useEffect } from 'react';

/**
 * Trava a rolagem da página por trás de telas cheias (fixed inset-0).
 * No iOS evita que o gesto role/“estique” o documento em vez do conteúdo.
 */
export function useLockDocumentScroll(active = true): void {
  useEffect(() => {
    if (!active) return;
    const { documentElement: html, body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
    };
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
    };
  }, [active]);
}
