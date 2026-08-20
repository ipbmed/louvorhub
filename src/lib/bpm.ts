const BPM_MIN = 30;
const BPM_MAX = 300;

/** Extrai BPM numérico válido (30–300) ou null (texto livre / vazio). */
export function parseBpm(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/\d+/);
  if (!match) return null;

  const n = Number(match[0]);
  if (!Number.isFinite(n)) return null;
  if (n < BPM_MIN || n > BPM_MAX) {
    throw new Error(`BPM deve estar entre ${BPM_MIN} e ${BPM_MAX}.`);
  }
  return Math.round(n);
}
