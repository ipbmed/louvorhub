/** Marcadores de estrutura da letra (não são cifras). */

export type LyricSectionType =
  | 'intro'
  | 'verse'
  | 'pre_chorus'
  | 'chorus'
  | 'post_chorus'
  | 'bridge'
  | 'breakdown'
  | 'solo'
  | 'interlude'
  | 'outro'
  | 'part'
  | 'comment'
  | 'custom';

export interface LyricSectionDef {
  key: string;
  type: LyricSectionType;
  name: string;
  description: string;
  /** Aparece no modo letra (sem cifra). */
  showInLyrics: boolean;
}

/** Definições oficiais usadas no editor e no parser. */
export const LYRIC_SECTION_DEFS: LyricSectionDef[] = [
  {
    key: 'INTRO',
    type: 'intro',
    name: 'Introdução',
    description: 'Início da música, geralmente instrumental, que apresenta o ritmo ou a melodia.',
    showInLyrics: false,
  },
  {
    key: 'ESTROFE',
    type: 'verse',
    name: 'Estrofe',
    description:
      'Parte que desenvolve a letra; normalmente possui versos diferentes em cada repetição.',
    showInLyrics: true,
  },
  {
    key: 'PRE_REFRAO',
    type: 'pre_chorus',
    name: 'Pré-refrão',
    description: 'Trecho que prepara e conduz a música para o refrão.',
    showInLyrics: true,
  },
  {
    key: 'REFRAO',
    type: 'chorus',
    name: 'Refrão',
    description:
      'Parte principal e mais repetitiva da música, geralmente com o gancho ou mensagem central.',
    showInLyrics: true,
  },
  {
    key: 'POS_REFRAO',
    type: 'post_chorus',
    name: 'Pós-refrão',
    description: 'Trecho após o refrão, podendo repetir uma frase, melodia ou vocalização.',
    showInLyrics: true,
  },
  {
    key: 'PONTE',
    type: 'bridge',
    name: 'Ponte',
    description: 'Seção contrastante que traz uma mudança antes de retornar a uma parte principal.',
    showInLyrics: true,
  },
  {
    key: 'BREAKDOWN',
    type: 'breakdown',
    name: 'Break / Breakdown',
    description:
      'Momento de redução ou mudança dos elementos musicais, criando contraste ou impacto.',
    showInLyrics: false,
  },
  {
    key: 'SOLO',
    type: 'solo',
    name: 'Solo',
    description: 'Trecho instrumental em que um instrumento ganha destaque.',
    showInLyrics: false,
  },
  {
    key: 'INTERLUDIO',
    type: 'interlude',
    name: 'Interlúdio',
    description: 'Pequeno trecho de transição, geralmente instrumental, entre duas seções.',
    showInLyrics: false,
  },
  {
    key: 'OUTRO',
    type: 'outro',
    name: 'Finalização',
    description: 'Parte final da música, podendo ser cantada, instrumental ou um encerramento gradual.',
    showInLyrics: true,
  },
  {
    key: 'PARTE',
    type: 'part',
    name: 'Parte',
    description:
      'Separa grandes partes da música (ex.: [PARTE]:1, [PARTE]:2). Aparece como divisória antes das seções seguintes.',
    showInLyrics: true,
  },
];

const DEF_BY_NORM_KEY = new Map<string, LyricSectionDef>();

function normalizeSectionKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_');
}

for (const def of LYRIC_SECTION_DEFS) {
  DEF_BY_NORM_KEY.set(normalizeSectionKey(def.key), def);
}

/** Aliases legados → chave canônica. */
const LEGACY_ALIASES: Record<string, string> = {
  CORO: 'REFRAO',
  REFRÃO: 'REFRAO',
  REFRAO: 'REFRAO',
  PRE_REFRÃO: 'PRE_REFRAO',
  PRE_REFRAO: 'PRE_REFRAO',
  POS_REFRÃO: 'POS_REFRAO',
  POS_REFRAO: 'POS_REFRAO',
  PÓS_REFRAO: 'POS_REFRAO',
  PÓS_REFRÃO: 'POS_REFRAO',
};

/** `[]` ou `[OFF]`: bloco sem rótulo. */
function isUnlabeledMarker(inner: string): boolean {
  const norm = normalizeSectionKey(inner);
  return norm === '' || norm === 'OFF';
}

export function isSectionMarkerContent(inner: string): boolean {
  const norm = normalizeSectionKey(inner);
  if (isUnlabeledMarker(inner) || DEF_BY_NORM_KEY.has(norm)) return true;
  const aliased = LEGACY_ALIASES[norm];
  return Boolean(aliased && DEF_BY_NORM_KEY.has(normalizeSectionKey(aliased)));
}

function resolveSectionDef(inner: string): LyricSectionDef | null {
  const norm = normalizeSectionKey(inner);
  const viaAlias = LEGACY_ALIASES[norm];
  const key = viaAlias ? normalizeSectionKey(viaAlias) : norm;
  return DEF_BY_NORM_KEY.get(key) ?? null;
}

export interface LyricSection {
  type: LyricSectionType;
  /** Chave canônica sem colchetes, ex.: REFRAO; vazio para comentário/bloco sem tag. */
  key: string;
  /** Nome da seção (ex.: Refrão, Estrofe 1) — sem a anotação. */
  label: string;
  /** Texto após o marcador, ex.: `2x` em `[REFRAO]:2x`. */
  annotation: string;
  lines: string[];
  /** true se a seção começou com um marcador `[TAG]`. */
  tagged: boolean;
}

/** Linha só com marcador, opcionalmente com anotação: `[REFRAO]:2x` */
const MARKER_LINE_RE = /^\s*\[([^\]]+)\](.*)$/;
const UNLABELED_LINE_RE = /^\s*\[\s*(?:OFF)?\s*\]\s*$/i;

/** Seções cujo texto após o marcador é o próprio número/nome: `[ESTROFE]:1` → "Estrofe 1". */
const SIDE_TEXT_IS_LABEL = new Set<LyricSectionType>(['verse', 'part']);

function matchMarkerLine(
  line: string,
): { def: LyricSectionDef; annotation: string } | null {
  const m = line.match(MARKER_LINE_RE);
  if (!m) return null;
  const def = resolveSectionDef(m[1]);
  if (!def) return null;

  let annotation = (m[2] || '').trim();
  if (annotation.startsWith(':')) annotation = annotation.slice(1).trim();
  return { def, annotation };
}

/**
 * Divide a letra em seções por marcadores `[TAG]`, blocos sem tag e comentários `###`.
 * - `[REFRAO]:2x` → label "Refrão" + annotation "2x".
 * - Estrofe/Parte: `[ESTROFE]` → "Estrofe"; `[ESTROFE]:1` → "Estrofe 1";
 *   `[ESTROFE]:AUTO` → próximo número; `[ESTROFE]:OFF` → sem rótulo.
 * - `AUTO`/`OFF` valem também para as demais seções.
 * - `[]` ou `[OFF]` → bloco sem rótulo.
 */
export function parseLyricSections(lyrics: string): LyricSection[] {
  const lines = (lyrics || '').replace(/\r\n/g, '\n').split('\n');
  const sections: LyricSection[] = [];

  let current: LyricSection | null = null;
  const typeCounts = new Map<LyricSectionType, number>();

  const nextNumber = (type: LyricSectionType): number => {
    const n = (typeCounts.get(type) || 0) + 1;
    typeCounts.set(type, n);
    return n;
  };

  const bumpLabel = (def: LyricSectionDef): string => {
    const n = nextNumber(def.type);
    // Refrão e pré-refrão nunca são numerados
    if (def.type === 'chorus' || def.type === 'pre_chorus' || n === 1) return def.name;
    return `${def.name} ${n}`;
  };

  const resolveLabel = (def: LyricSectionDef, sideText: string): { label: string; annotation: string } => {
    const keyword = sideText.toUpperCase();
    if (keyword === 'OFF') return { label: '', annotation: '' };
    if (keyword === 'AUTO') return { label: `${def.name} ${nextNumber(def.type)}`, annotation: '' };

    if (!SIDE_TEXT_IS_LABEL.has(def.type)) return { label: bumpLabel(def), annotation: sideText };
    if (!sideText) return { label: def.name, annotation: '' };

    const explicit = Number.parseInt(sideText, 10);
    if (!Number.isNaN(explicit)) {
      typeCounts.set(def.type, Math.max(typeCounts.get(def.type) || 0, explicit));
    }
    return { label: `${def.name} ${sideText}`, annotation: '' };
  };

  const flush = () => {
    if (!current) return;
    const hasContent = current.lines.some((l) => l.trim().length > 0);
    if (hasContent || current.type === 'comment' || current.tagged) {
      while (current.lines.length && !current.lines[current.lines.length - 1].trim()) {
        current.lines.pop();
      }
      sections.push(current);
    }
    current = null;
  };

  const startUntaggedVerse = () => {
    current = {
      type: 'verse',
      key: '',
      label: `Estrofe ${nextNumber('verse')}`,
      annotation: '',
      lines: [],
      tagged: false,
    };
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('###')) {
      flush();
      const commentText = trimmed.replace(/^###\s*/, '');
      sections.push({
        type: 'comment',
        key: '',
        label: 'Comentário',
        annotation: '',
        lines: [commentText],
        tagged: false,
      });
      continue;
    }

    if (UNLABELED_LINE_RE.test(trimmed)) {
      flush();
      current = { type: 'custom', key: '', label: '', annotation: '', lines: [], tagged: true };
      continue;
    }

    const marker = matchMarkerLine(trimmed);
    if (marker) {
      flush();
      const { label, annotation } = resolveLabel(marker.def, marker.annotation);
      current = {
        type: marker.def.type,
        key: marker.def.key,
        label,
        annotation,
        lines: [],
        tagged: true,
      };
      continue;
    }

    if (!trimmed) {
      if (!current) continue;
      if (current.tagged) {
        if (current.lines.length && current.lines[current.lines.length - 1] !== '') {
          current.lines.push('');
        }
      } else if (current.lines.some((l) => l.trim())) {
        flush();
      }
      continue;
    }

    if (!current) startUntaggedVerse();
    current!.lines.push(line);
  }

  flush();
  return sections;
}

/** Há texto cantado além de cifras `[C]` / marcadores. */
function sectionHasSungText(section: LyricSection): boolean {
  return section.lines.some((line) => line.replace(/\[[^\]]*\]/g, '').trim().length > 0);
}

/**
 * Modo cifra: todas as seções (inclui intro, solo, comentários…).
 * Modo letra: só trechos com texto cantado (acordes `[C]` sozinhos não contam).
 * Divisórias `[PARTE]` permanecem mesmo sem linhas.
 */
export function filterSectionsForView(
  sections: LyricSection[],
  mode: 'chords' | 'lyrics',
): LyricSection[] {
  if (mode === 'chords') return sections;
  return sections.filter((s) => {
    if (s.type === 'comment') return false;
    if (s.type === 'part') return true;
    return sectionHasSungText(s);
  });
}

export function sectionMarkerToken(key: string): string {
  return `[${key}]`;
}
