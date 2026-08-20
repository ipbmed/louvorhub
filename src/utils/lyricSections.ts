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

export function isSectionMarkerContent(inner: string): boolean {
  const norm = normalizeSectionKey(inner);
  if (DEF_BY_NORM_KEY.has(norm)) return true;
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
 * Anotações: `[REFRAO]:2x` → label "Refrão" + annotation "2x".
 */
export function parseLyricSections(lyrics: string): LyricSection[] {
  const lines = (lyrics || '').replace(/\r\n/g, '\n').split('\n');
  const sections: LyricSection[] = [];

  let current: LyricSection | null = null;
  let verseCount = 0;
  const typeCounts = new Map<LyricSectionType, number>();

  const bumpLabel = (def: LyricSectionDef): string => {
    const n = (typeCounts.get(def.type) || 0) + 1;
    typeCounts.set(def.type, n);

    // Refrão nunca é numerado
    if (def.type === 'chorus') return def.name;

    if (def.type === 'verse') {
      verseCount = Math.max(verseCount, n);
      return `${def.name} ${n}`;
    }

    if (n === 1) return def.name;
    return `${def.name} ${n}`;
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
    verseCount += 1;
    typeCounts.set('verse', (typeCounts.get('verse') || 0) + 1);
    current = {
      type: 'verse',
      key: '',
      label: `Estrofe ${verseCount}`,
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

    const marker = matchMarkerLine(trimmed);
    if (marker) {
      flush();
      current = {
        type: marker.def.type,
        key: marker.def.key,
        label: bumpLabel(marker.def),
        annotation: marker.annotation,
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

const LYRICS_VISIBLE = new Set(
  LYRIC_SECTION_DEFS.filter((d) => d.showInLyrics).map((d) => d.type),
);
// Blocos sem tag (legado) também aparecem no modo letra
LYRICS_VISIBLE.add('verse');

/**
 * Modo cifra: todas as seções (inclui intro, solo, comentários…).
 * Modo letra: só trechos cantados (estrofe, pré/pós-refrão, refrão, ponte, outro).
 */
export function filterSectionsForView(
  sections: LyricSection[],
  mode: 'chords' | 'lyrics',
): LyricSection[] {
  if (mode === 'chords') return sections;
  return sections.filter((s) => LYRICS_VISIBLE.has(s.type) && s.type !== 'comment');
}

export function sectionMarkerToken(key: string): string {
  return `[${key}]`;
}
