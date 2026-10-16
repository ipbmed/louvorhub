/**
 * Importa "Salvo pela Graça" (Daniel Souza) — cifra do Cifra Club (tom D, sem capotraste),
 * letra conferida com o Letras. O refrão modulado (tom E) fica como ponte, como na cifra.
 * Atualiza se encontrar o cântico pelo título; senão insere.
 *
 * Uso:
 *   node scripts/import-salvo-pela-graca.mjs
 *   node scripts/import-salvo-pela-graca.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TITLE = 'Salvo pela Graça';
const TONE = 'D';
const COMPOSITION = 'Daniel Souza';
const TAG = 'Daniel Souza';
const LINKS = [
  { label: 'Cifra Club', url: 'https://www.cifraclub.com.br/daniel-souza/salvo-pela-graca/' },
  { label: 'Letras', url: 'https://www.letras.mus.br/daniel-souza/479682/' },
  { label: 'Spotify', url: 'https://open.spotify.com/track/0CehK1Q0hxDDSRV9iFcbQ8' },
];

const INTRO = `[INTRO]
[D] [D7M(9)]`;

const ESTROFE_1 = `[ESTROFE]
[D]Justifi[G]cado eu fui
[D]Santific[G]ado eu sou
[D]Glorifi[G]cado [D/F#]serei, [Em]através de [A]Cristo`;

const ESTROFE_2 = `[ESTROFE]
[D]Fui livre da [G]culpa do pecado
[D]Sou livre do [G]poder do pecado
[D]E da [G]presença do [D/F#]pecado, [G]livre [A]serei`;

const PRE_REFRAO = `[PRE_REFRAO]
[Em]De glória em [D/F#]glória
[G]De fé em [D/F#]fé
[Em]Graça [D/F#]sobre graça
[G]Graça [A]sobre graça`;

const REFRAO = `[REFRAO]
[Em]Sal[D/F#]vo [G]
[D/F#]Salvo pela [Em]gra[D/F#]ça [G]
[D/F#]Mediante a [Em]fé em [D/F#]Cristo
[G]Eu sou [A]salvo
[Em]Não vem de [A]mim, é dom de [D]Deus`;

const INTERLUDIO = `[INTERLUDIO]
[D4] [D] [D4] [D]
[A] [Em] [F#m] [G] [A] [B]`;

const PONTE = `[PONTE]
[F#m]Sal[E/G#]vo [A]
[E/G#]Salvo pela [F#m]gra[E/G#]ça [A]
[E/G#]Mediante a [F#m]fé em [E/G#]Cristo
[A]Eu sou [B]salvo
[F#m]Não vem de [B]mim, é dom de [E]Deus`;

const OUTRO = `[OUTRO]
[E] [E7M(9)]`;

const LYRICS = [
  INTRO,
  ESTROFE_1,
  ESTROFE_2,
  PRE_REFRAO,
  REFRAO,
  INTRO,
  ESTROFE_1,
  ESTROFE_2,
  PRE_REFRAO,
  REFRAO,
  INTERLUDIO,
  PONTE,
  OUTRO,
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

const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

async function main() {
  const { data: existing, error } = await sb
    .from('songs')
    .select('id, title, kind, tags')
    .ilike('title', '%salvo pela gra%');
  if (error) throw error;
  const match =
    existing?.find((s) => s.kind === 'cantico' && normalize(s.title) === 'salvo pela graca') ??
    null;

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
    console.log(`linhas: ${LYRICS.split('\n').length}`);
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
