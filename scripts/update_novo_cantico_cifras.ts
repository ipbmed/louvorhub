/**
 * Atualiza no Supabase hinos do Novo Cântico.
 *
 * Uso:
 *   npx tsx scripts/update_novo_cantico_cifras.ts --dry-run
 *   npx tsx scripts/update_novo_cantico_cifras.ts
 *   npx tsx scripts/update_novo_cantico_cifras.ts --reformat
 *     → só regrava hinos no formato "cifra em linha própria" (import anterior)
 *
 * Requer no .env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

config({ path: resolve(root, '.env.local') });
config({ path: resolve(root, '.env') });

const dryRun = process.argv.includes('--dry-run');
const reformat = process.argv.includes('--reformat');

type ExtractedHymn = {
  number: string;
  number_int: number;
  title: string;
  key: string;
  time_signature: string;
  lyrics: string;
};

function hasChords(lyrics: string | null | undefined): boolean {
  return /\[[A-G]/.test(lyrics || '');
}

/** Formato do import antigo: linha só com [C] [G] acima da letra. */
function hasStackedChordLines(lyrics: string | null | undefined): boolean {
  return /^(?:\[[A-G][^\]]*\]\s*)+$/m.test(lyrics || '');
}

function loadHymns(): ExtractedHymn[] {
  const path = resolve(__dirname, 'data/novo-cantico-cifras.json');
  return JSON.parse(readFileSync(path, 'utf8')) as ExtractedHymn[];
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    console.error(
      'Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local\n' +
        '(updates de songs exigem service role / admin).',
    );
    process.exit(1);
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const hymns = loadHymns();
  console.log(`Hinos no JSON: ${hymns.length}`);
  console.log(
    dryRun
      ? 'Modo: DRY-RUN (não grava)'
      : reformat
        ? 'Modo: REFORMAT (cifras empilhadas → inline)'
        : 'Modo: APPLY (só sem cifra)',
  );
  console.log('');

  const { data: songs, error } = await sb
    .from('songs')
    .select('id, number, title, lyrics_md, musical_key, time_signature, kind, hymnals(name)')
    .eq('kind', 'hino')
    .not('number', 'is', null)
    .order('number');

  if (error) {
    console.error('Erro ao listar songs:', error.message);
    process.exit(1);
  }

  const byNumber = new Map<number, NonNullable<typeof songs>[number][]>();
  for (const s of songs || []) {
    if (s.number == null) continue;
    const list = byNumber.get(s.number) || [];
    list.push(s);
    byNumber.set(s.number, list);
  }

  const hymnByInt = new Map(hymns.map((h) => [h.number_int, h]));

  let updated = 0;
  let skippedHasChords = 0;
  let skippedNoMatch = 0;
  let skippedEmpty = 0;
  let skippedNotStacked = 0;
  let errors = 0;

  for (const [num, hymn] of hymnByInt) {
    const matches = byNumber.get(num);
    if (!matches?.length) {
      skippedNoMatch++;
      continue;
    }

    const song =
      matches.find((s) => {
        const h = s.hymnals as { name?: string } | { name?: string }[] | null;
        const name = Array.isArray(h) ? h[0]?.name : h?.name;
        return (name || '').toLowerCase().includes('novo c');
      }) || matches[0];

    if (!hymn.lyrics?.trim()) {
      skippedEmpty++;
      continue;
    }

    if (reformat) {
      if (!hasStackedChordLines(song.lyrics_md)) {
        skippedNotStacked++;
        continue;
      }
    } else if (hasChords(song.lyrics_md)) {
      skippedHasChords++;
      continue;
    }

    const payload = {
      lyrics_md: hymn.lyrics,
      musical_key: hymn.key,
      time_signature: hymn.time_signature,
      updated_at: new Date().toISOString(),
    };

    console.log(
      `#${num} "${song.title}" → key=${hymn.key} meter=${hymn.time_signature} (${hymn.lyrics.length} chars)`,
    );

    if (dryRun) {
      updated++;
      continue;
    }

    const { error: upErr } = await sb.from('songs').update(payload).eq('id', song.id);
    if (upErr) {
      console.error(`  ERRO #${num}:`, upErr.message);
      errors++;
    } else {
      updated++;
    }
  }

  console.log('\nResumo:');
  console.log(`  atualizados:           ${updated}`);
  if (reformat) {
    console.log(`  sem formato empilhado: ${skippedNotStacked}`);
  } else {
    console.log(`  já tinham cifra:       ${skippedHasChords}`);
  }
  console.log(`  sem match no DB:       ${skippedNoMatch}`);
  console.log(`  letra vazia no PDF:    ${skippedEmpty}`);
  console.log(`  erros:                 ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
