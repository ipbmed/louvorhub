/**
 * Importa "Cria em Mim" (Comunidade de Nilópolis) — cifra revisada do Cifra Club
 * (tom C, sem capotraste), estrutura conforme a letra do Letras.
 * Atualiza se encontrar pelo título; senão insere.
 *
 * Uso:
 *   node scripts/import-cria-em-mim.mjs
 *   node scripts/import-cria-em-mim.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TITLE = 'Cria em Mim';
const TONE = 'C';
const COMPOSITION = 'Pr. Marcus Vinicius';
const TAG = 'Comunidade de Nilópolis';
const LINKS = [
  { label: 'Cifra Club', url: 'https://www.cifraclub.com.br/comunidade-de-nilopolis/cria-em-mim/' },
  { label: 'Letras', url: 'https://www.letras.mus.br/comunidade-de-nilopolis/cria-em-mim/' },
  { label: 'YouTube', url: 'https://www.youtube.com/watch?v=6XQrYQujlbs' },
];

const ESTROFE = `[ESTROFE]
[C9]Cria em mim, ó Deus, cria em mim, ó Deus
Um coração [F]puro
E re[C9]nova, e renova
Um espírito ina[F]balável [F] [C/E]

[Dm]Não retires de [F]nós o Teu es[C]pírito
[Dm]Não retires de [F]nós o Teu es[C]pírito [G/B]`;

const PRE_REFRAO = `[PRE_REFRAO]
[Am]Quero aprender com meus [Em]erros
[F]E não mais [C9]cometê-[G/B]los
[Am]Sei que não vai ser tão [Em]fácil
Mas, di[F]fícil é continuar no erro
E vi[Dm]ver no mesmo desespero
E ficar para [G]trás`;

const REFRAO = `[REFRAO]
[C]Eu quero ser [Em]
Eu quero ser [Am]
[F]Um homem segundo o [G]coração de [C]Deus
[C]Eu quero ser [Em]
Eu quero ser [Am]
[Dm]Um homem segundo o [G]coração de [C]Deus`;

const LYRICS = [
  `[INTRO]\n[C9] [F]`,
  ESTROFE,
  PRE_REFRAO,
  REFRAO,
  ESTROFE,
  PRE_REFRAO,
  REFRAO,
  PRE_REFRAO,
  REFRAO,
].join('\n\n');

const dryRun = process.argv.includes('--dry-run');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL/key');
  process.exit(1);
}
const sb = createClient(url, key);

async function main() {
  const { data: existing, error } = await sb
    .from('songs')
    .select('id, title, kind')
    .ilike('title', '%cria em mim%');
  if (error) throw error;
  const match = existing?.find((s) => s.kind === 'cantico') ?? null;

  const payload = {
    title: TITLE,
    kind: 'cantico',
    number: null,
    lyrics_md: LYRICS,
    musical_key: TONE,
    composition: COMPOSITION,
    author: COMPOSITION,
    reviewed: true,
    updated_at: new Date().toISOString(),
    tags: [TAG],
  };

  if (dryRun) {
    console.log(`[dry-run] ${match ? `UPDATE ${match.id}` : 'INSERT'} "${TITLE}" tom=${TONE}`);
    console.log('Similares no catálogo:', existing);
    return;
  }

  let songId;
  if (match) {
    const { error: upErr } = await sb.from('songs').update(payload).eq('id', match.id);
    if (upErr) throw upErr;
    songId = match.id;
    console.log(`UPDATE ${TITLE} (${songId})`);
  } else {
    const { data: inserted, error: inErr } = await sb
      .from('songs')
      .insert(payload)
      .select('id')
      .single();
    if (inErr) throw inErr;
    songId = inserted.id;
    console.log(`INSERT ${TITLE} (${songId})`);
  }

  const labels = LINKS.map((l) => l.label);
  const { error: delErr } = await sb.from('song_links').delete().eq('song_id', songId).in('label', labels);
  if (delErr) throw delErr;
  const { data: existingLinks } = await sb
    .from('song_links')
    .select('sort_order')
    .eq('song_id', songId)
    .order('sort_order', { ascending: false })
    .limit(1);
  let sortOrder = (existingLinks?.[0]?.sort_order ?? -1) + 1;
  const { error: linkErr } = await sb
    .from('song_links')
    .insert(LINKS.map((l) => ({ song_id: songId, label: l.label, url: l.url, sort_order: sortOrder++ })));
  if (linkErr) throw linkErr;
  console.log(`links: ${labels.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
