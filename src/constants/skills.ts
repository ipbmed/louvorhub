/** Habilidades conhecidas do ministério de louvor (o usuário pode acrescentar outras). */
export const KNOWN_SKILLS = [
  'Vocal',
  'Back Vocal',
  'Violão',
  'Guitarra',
  'Baixo',
  'Bateria',
  'Teclado',
  'Piano',
  'Violino',
  'Saxofone',
  'Flauta',
  'Percussão',
  'Cajón',
  'Sonoplastia',
  'Projeção',
  'Transmissão',
  'Direção de Louvor',
] as const;

export type KnownSkill = (typeof KNOWN_SKILLS)[number];

/** Instrumentos e cantores */
export const MUSICIAN_SKILLS = [
  'Vocal',
  'Back Vocal',
  'Violão',
  'Guitarra',
  'Baixo',
  'Bateria',
  'Teclado',
  'Piano',
  'Violino',
  'Saxofone',
  'Flauta',
  'Percussão',
  'Cajón',
  'Direção de Louvor',
] as const;

/** Funções técnicas / mídia */
export const TECHNICIAN_SKILLS = [
  'Sonoplastia',
  'Projeção',
  'Transmissão',
] as const;

export type MusicianSkill = (typeof MUSICIAN_SKILLS)[number];
export type TechnicianSkill = (typeof TECHNICIAN_SKILLS)[number];

export function isMusicianSkill(skill: string): boolean {
  return MUSICIAN_SKILLS.some((s) => s.toLowerCase() === skill.toLowerCase());
}

export function isTechnicianSkill(skill: string): boolean {
  return TECHNICIAN_SKILLS.some((s) => s.toLowerCase() === skill.toLowerCase());
}

export function categorizeSkills(skills: string[]): {
  musician: string[];
  technician: string[];
  other: string[];
} {
  const musician: string[] = [];
  const technician: string[] = [];
  const other: string[] = [];
  for (const skill of skills) {
    if (isMusicianSkill(skill)) musician.push(skill);
    else if (isTechnicianSkill(skill)) technician.push(skill);
    else other.push(skill);
  }
  return { musician, technician, other };
}

/** Resumo legível para role_label / escalas */
export function formatMemberAspects(musician: string[], technician: string[]): string {
  const parts: string[] = [];
  if (musician.length) parts.push(`Músico: ${musician.join(', ')}`);
  if (technician.length) parts.push(`Técnico: ${technician.join(', ')}`);
  return parts.join(' · ') || 'Integrante';
}

/** Funções típicas usadas nas escalas */
export const SCHEDULE_ROLE_OPTIONS = [...MUSICIAN_SKILLS, ...TECHNICIAN_SKILLS] as const;

export function getProfileSkills(user?: {
  skills?: string[];
  mainRole?: string;
} | null): string[] {
  if (user?.skills?.length) return user.skills;
  if (user?.mainRole?.trim()) return [user.mainRole.trim()];
  return [];
}

/** Compara função da escala com habilidades do perfil (ex.: "Bateria" ↔ "Bateria"). */
export function skillMatchesRole(skill: string, role: string): boolean {
  const s = skill.trim().toLowerCase();
  const r = role.trim().toLowerCase();
  if (!s || !r) return false;
  return s === r || s.includes(r) || r.includes(s);
}

export function hasSkillForRole(skills: string[], role: string): boolean {
  return skills.some((skill) => skillMatchesRole(skill, role));
}

/** Ordena: quem tem a habilidade da função primeiro; os demais permanecem elegíveis. */
export function partitionBySkillMatch<T>(
  items: T[],
  role: string,
  getSkills: (item: T) => string[],
): { suggested: T[]; others: T[] } {
  const suggested: T[] = [];
  const others: T[] = [];
  for (const item of items) {
    if (hasSkillForRole(getSkills(item), role)) suggested.push(item);
    else others.push(item);
  }
  return { suggested, others };
}
