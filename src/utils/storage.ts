/**
 * @deprecated LocalStorage persistence was replaced by Supabase services.
 * Kept only so accidental imports fail loudly at typecheck if resurfaced.
 * Use `@/services/*` and `@/utils/exportBackup` instead.
 */

export function deprecatedLocalStorageRemoved(): never {
  throw new Error(
    'localStorage storage removido. Use os services Supabase em src/services/.',
  );
}
