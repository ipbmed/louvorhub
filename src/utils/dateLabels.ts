/** Datas no formato YYYY-MM-DD interpretadas no fuso local (meio-dia evita saltos de DST). */
function parseLocalDate(date: string): Date {
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

export function todayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function dayParts(date: string): { day: string; month: string; weekday: string } {
  const d = parseLocalDate(date);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
  };
}

/** "Hoje", "Amanhã", "Em 3 dias", "Ontem", "Há 5 dias" ou data curta. */
export function relativeDay(date: string): string {
  const diff = Math.round(
    (parseLocalDate(date).getTime() - startOfToday().getTime()) / 86_400_000,
  );
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff > 1 && diff <= 7) return `Em ${diff} dias`;
  if (diff === -1) return 'Ontem';
  if (diff < -1 && diff >= -7) return `Há ${-diff} dias`;
  return parseLocalDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** "domingo, 12 de outubro" */
export function formatDateLong(date: string): string {
  return parseLocalDate(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
