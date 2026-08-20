import type { LyricSection, LyricSectionType } from './lyricSections';

/** Linha que força nova página no telão. */
export function isManualSlideBreak(line: string): boolean {
  const t = line.trim();
  return t === '---' || t === '—' || t === '–' || t === '//';
}

export type ProjectionLayoutMode = 'chunks' | 'font' | 'scroll';

export interface ProjectionSlide {
  id: string;
  type: LyricSectionType;
  label: string;
  annotation: string;
  lines: string[];
  /** Índice 1-based do pedaço dentro da seção. */
  partIndex: number;
  partCount: number;
  sectionIndex: number;
}

const STORAGE_KEY = 'louvorhub.projectionLayout';

const MIN_FONT_PX = 18;
const MAX_FONT_PX = 120;
const DEFAULT_FONT_PX = 48;
const FONT_STEP_PX = 4;

export interface ProjectionLayoutSettings {
  mode: ProjectionLayoutMode;
  /** Linhas por slide no modo chunks (2–8). */
  linesPerSlide: number;
  /** Tamanho da fonte no modo fonte (px). */
  fontPx: number;
}

const DEFAULT_SETTINGS: ProjectionLayoutSettings = {
  mode: 'chunks',
  linesPerSlide: 4,
  fontPx: DEFAULT_FONT_PX,
};

function clampFontPx(n: number): number {
  return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, Math.round(n)));
}

export function loadProjectionLayoutSettings(): ProjectionLayoutSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as {
      mode?: string;
      linesPerSlide?: number;
      fontPx?: number;
      manualFontPx?: number;
    };
    let mode: ProjectionLayoutMode = 'chunks';
    if (parsed.mode === 'scroll') mode = 'scroll';
    else if (parsed.mode === 'font' || parsed.mode === 'autofit') mode = 'font';
    else if (parsed.mode === 'chunks') mode = 'chunks';

    const lines = Number(parsed.linesPerSlide);
    const fontFromNew = Number(parsed.fontPx);
    const fontFromOld = Number(parsed.manualFontPx);
    const fontPx = Number.isFinite(fontFromNew)
      ? clampFontPx(fontFromNew)
      : Number.isFinite(fontFromOld)
        ? clampFontPx(fontFromOld)
        : DEFAULT_FONT_PX;

    return {
      mode,
      linesPerSlide: Number.isFinite(lines) ? Math.min(8, Math.max(2, Math.round(lines))) : 4,
      fontPx,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveProjectionLayoutSettings(settings: ProjectionLayoutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function bumpFontPx(current: number, direction: 1 | -1): number {
  return clampFontPx(current + direction * FONT_STEP_PX);
}

export { MIN_FONT_PX, MAX_FONT_PX, DEFAULT_FONT_PX };

function nonEmptyLines(lines: string[]): string[] {
  return lines.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0 && !isManualSlideBreak(l));
}

/** Divide linhas de uma seção pelos marcadores `---`. */
export function splitByManualBreaks(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isManualSlideBreak(line)) {
      const cleaned = nonEmptyLines(current);
      if (cleaned.length) chunks.push(cleaned);
      current = [];
      continue;
    }
    current.push(line);
  }

  const cleaned = nonEmptyLines(current);
  if (cleaned.length) chunks.push(cleaned);
  return chunks;
}

function chunkByLineCount(lines: string[], maxLines: number): string[][] {
  if (maxLines < 1) return [lines];
  if (lines.length <= maxLines) return [lines];
  const out: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    out.push(lines.slice(i, i + maxLines));
  }
  return out;
}

/**
 * Monta slides de projeção a partir das seções (já filtradas para modo letra).
 * - chunks: respeita `---` e ainda quebra a cada N linhas
 * - font / scroll: respeita só `---` (seção inteira em um slide se não houver quebra)
 */
export function buildProjectionSlides(
  sections: LyricSection[],
  settings: ProjectionLayoutSettings,
): ProjectionSlide[] {
  const slides: ProjectionSlide[] = [];

  sections.forEach((section, sectionIndex) => {
    const manualParts = splitByManualBreaks(section.lines);
    if (manualParts.length === 0) return;

    const parts =
      settings.mode === 'chunks'
        ? manualParts.flatMap((part) => chunkByLineCount(part, settings.linesPerSlide))
        : manualParts;

    const partCount = parts.length;
    parts.forEach((lines, i) => {
      slides.push({
        id: `${sectionIndex}-${i}`,
        type: section.type,
        label: section.label,
        annotation: section.annotation,
        lines,
        partIndex: i + 1,
        partCount,
        sectionIndex,
      });
    });
  });

  return slides;
}

/** Abrevia o nome da seção para os botões de salto do telão. */
function compactSectionBase(slide: ProjectionSlide): string {
  const numMatch = slide.label.match(/(\d+)\s*$/);
  const n = numMatch?.[1];

  switch (slide.type) {
    case 'verse':
      return n ? `E${n}` : 'E';
    case 'chorus':
      return n ? `Ref${n}` : 'Ref';
    case 'pre_chorus':
      return n ? `Pré${n}` : 'Pré';
    case 'post_chorus':
      return n ? `Pós${n}` : 'Pós';
    case 'bridge':
      return n ? `Pon${n}` : 'Pon';
    case 'intro':
      return n ? `Int${n}` : 'Int';
    case 'outro':
      return n ? `Fin${n}` : 'Fin';
    case 'breakdown':
      return n ? `Brk${n}` : 'Brk';
    case 'solo':
      return n ? `Solo${n}` : 'Solo';
    case 'interlude':
      return n ? `Itr${n}` : 'Itr';
    case 'comment':
      return '###';
    default: {
      const word = slide.label.trim().split(/\s+/)[0] || '?';
      return word.length <= 4 ? word : `${word.slice(0, 3)}.`;
    }
  }
}

/** Rótulo curto para a barra de slides (ex.: E1·1/2, Ref). */
export function slideJumpLabel(slide: ProjectionSlide): string {
  const base = compactSectionBase(slide);
  if (slide.partCount <= 1) return base;
  return `${base}·${slide.partIndex}/${slide.partCount}`;
}

/** Rótulo completo para tooltip / acessibilidade. */
export function slideJumpTitle(slide: ProjectionSlide): string {
  const base = slide.annotation ? `${slide.label}: ${slide.annotation}` : slide.label;
  if (slide.partCount <= 1) return base;
  return `${base} · ${slide.partIndex}/${slide.partCount}`;
}
