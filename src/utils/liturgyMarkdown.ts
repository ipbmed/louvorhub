import type { LiturgyItem, LiturgyItemType, Song } from '@/types';

/** Aliases aceitos na 1ª coluna / tag do tipo. */
const TYPE_ALIASES: Record<string, LiturgyItemType> = {
  hymn: 'hymn',
  hino: 'hymn',
  louvor: 'hymn',
  musica: 'hymn',
  música: 'hymn',
  canto: 'hymn',
  prayer: 'prayer',
  oracao: 'prayer',
  oração: 'prayer',
  reading: 'reading',
  leitura: 'reading',
  biblia: 'reading',
  bíblia: 'reading',
  sermon: 'sermon',
  pregacao: 'sermon',
  pregação: 'sermon',
  mensagem: 'sermon',
  offertory: 'offertory',
  ofertas: 'offertory',
  dizimos: 'offertory',
  dízimos: 'offertory',
  oferta: 'offertory',
  supper: 'supper',
  ceia: 'supper',
  benediction: 'benediction',
  bencao: 'benediction',
  bênção: 'benediction',
  bencao_final: 'benediction',
  announcements: 'announcements',
  anuncios: 'announcements',
  anúncios: 'announcements',
  custom: 'custom',
  outro: 'custom',
  momento: 'custom',
  liturgia: 'custom',
};

export const LITURGY_MARKDOWN_HELP = `Cada linha é um momento. Formatos aceitos:

• Lista Markdown
  - [música] Cântico de Louvor | responsável: Equipe | música: 258
  - [música] Louvor | música: Aclame ao Senhor
  - [oração] Oração de Invocação | responsável: Pr. João
  - [leitura] Salmo 95 | detalhes: Salmo 95:1-7
  - [pregação] A Palavra | responsável: Rev. Marcos

• Numerada com pipes
  1. hymn | Cântico de Louvor | Equipe | música:258
  2. prayer | Oração de Invocação | Pr. João

Tipos: música, oração, leitura, pregação, ofertas, ceia, bênção, anúncios, outro
Campos opcionais após o título (separados por |):
  responsável: Nome
  detalhes: texto
  música: 258 (ou #258) ou o título, ex.: música: Aclame ao Senhor
    (hino: também é aceito)
  duração: 5 min

Linhas em branco e títulos (# …) são ignorados.`;

export const LITURGY_MARKDOWN_EXAMPLE = `- [música] Prelúdio & Cântico de Louvor | responsável: Equipe | música: 258
- [oração] Oração de Invocação | responsável: Pr. Carlos
- [leitura] Leitura Bíblica | detalhes: Salmo 95:1-7
- [música] Cântico Congregacional | responsável: Equipe
- [pregação] Pregação da Palavra | responsável: Rev. Marcos Silva
- [ofertas] Dízimos e Ofertas
- [ceia] Ceia do Senhor
- [bênção] Bênção Apostólica & Tríplice Amém`;

function normalizeKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

function resolveType(raw: string): LiturgyItemType {
  const key = normalizeKey(raw.replace(/^\[|\]$/g, ''));
  return TYPE_ALIASES[key] || TYPE_ALIASES[key.replace(/_/g, '')] || 'custom';
}

function normalizeTitle(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findSongId(ref: string | undefined, songs: Song[]): string | undefined {
  const value = ref?.trim();
  if (!value) return undefined;

  const numeric = value.match(/^(?:#|n[º°o.]?\s*|hino\s*)?(\d+)$/i);
  if (numeric) {
    const num = Number.parseInt(numeric[1], 10);
    return songs.find((s) => s.number === num)?.id;
  }

  const target = normalizeTitle(value);
  if (!target) return undefined;
  const exact = songs.find((s) => normalizeTitle(s.title) === target);
  if (exact) return exact.id;
  const partial = songs.find((s) => normalizeTitle(s.title).includes(target));
  if (partial) return partial.id;

  const digits = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(digits) ? songs.find((s) => s.number === digits)?.id : undefined;
}

type ParsedFields = {
  type: LiturgyItemType;
  title: string;
  responsible?: string;
  details?: string;
  duration?: string;
  songRef?: string;
};

function applyNamedField(target: ParsedFields, keyRaw: string, value: string) {
  const key = normalizeKey(keyRaw);
  if (['responsavel', 'resp', 'por', 'dirigente'].includes(key)) {
    target.responsible = value;
  } else if (['detalhes', 'details', 'texto', 'nota', 'obs'].includes(key)) {
    target.details = value;
  } else if (['duracao', 'duration', 'tempo'].includes(key)) {
    target.duration = value;
  } else if (['musica', 'hino', 'cantico', 'louvor', 'song', 'numero', 'n'].includes(key)) {
    target.songRef = value;
  }
}

/**
 * Aceita:
 * - [música] Título | responsável: X | música: 12 (ou título)
 * - 1. hymn | Título | X | música:12
 * - hymn: Título | responsável: X
 */
function parseLine(line: string): ParsedFields | null {
  let raw = line.trim();
  if (!raw || raw.startsWith('#')) return null;
  raw = raw.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '');
  if (!raw) return null;

  // [tipo] título ...
  const bracket = raw.match(/^\[([^\]]+)\]\s*(.+)$/i);
  if (bracket) {
    const fields: ParsedFields = {
      type: resolveType(bracket[1]),
      title: '',
    };
    const rest = bracket[2].trim();
    const parts = rest.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    fields.title = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const named = part.match(/^([^:]+):\s*(.+)$/);
      if (named) applyNamedField(fields, named[1], named[2].trim());
      else if (!fields.responsible) fields.responsible = part;
      else if (!fields.details) fields.details = part;
    }
    if (!fields.title) return null;
    return fields;
  }

  // tipo: título | ...
  const colonType = raw.match(/^([A-Za-zÀ-ÿ_]+)\s*:\s*(.+)$/);
  if (colonType && TYPE_ALIASES[normalizeKey(colonType[1])]) {
    const fields: ParsedFields = {
      type: resolveType(colonType[1]),
      title: '',
    };
    const parts = colonType[2].split('|').map((p) => p.trim()).filter(Boolean);
    fields.title = parts[0] || '';
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const named = part.match(/^([^:]+):\s*(.+)$/);
      if (named) applyNamedField(fields, named[1], named[2].trim());
      else if (!fields.responsible) fields.responsible = part;
      else if (!fields.details) fields.details = part;
    }
    if (!fields.title) return null;
    return fields;
  }

  // tipo | título | responsável | ...
  const parts = raw.split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && TYPE_ALIASES[normalizeKey(parts[0])]) {
    const fields: ParsedFields = {
      type: resolveType(parts[0]),
      title: parts[1],
    };
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      const named = part.match(/^([^:]+):\s*(.+)$/);
      if (named) applyNamedField(fields, named[1], named[2].trim());
      else if (part.startsWith('#') || /^\d+$/.test(part)) fields.songRef = part;
      else if (!fields.responsible) fields.responsible = part;
      else if (!fields.details) fields.details = part;
    }
    return fields;
  }

  // fallback: só o título → custom
  if (parts.length === 1) {
    return { type: 'custom', title: parts[0] };
  }

  return null;
}

export function parseLiturgyMarkdown(
  markdown: string,
  songs: Song[] = [],
): LiturgyItem[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const items: LiturgyItem[] = [];
  const stamp = Date.now();

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    items.push({
      id: `li-md-${stamp}-${items.length + 1}`,
      order: items.length + 1,
      type: parsed.type,
      title: parsed.title,
      responsible: parsed.responsible,
      details: parsed.details,
      duration: parsed.duration,
      songId:
        parsed.type === 'hymn' ? findSongId(parsed.songRef, songs) : undefined,
    });
  }

  return items;
}
