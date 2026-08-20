const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Normaliza texto para slug de link (a-z, 0-9, hífen). */
export function normalizeShareSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateShareSlug(slug: string): string | null {
  if (!slug) return 'Informe um nome para o link.';
  if (slug.length < 3) return 'O nome do link precisa ter pelo menos 3 caracteres.';
  if (slug.length > 64) return 'O nome do link pode ter no máximo 64 caracteres.';
  if (!SLUG_RE.test(slug)) {
    return 'Use apenas letras minúsculas, números e hífens (ex.: culto-domingo).';
  }
  return null;
}
