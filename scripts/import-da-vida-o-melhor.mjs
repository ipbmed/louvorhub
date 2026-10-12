/**
 * Importa "Da Vida, o Melhor" (Projeto Sola) — cifra revisada do Cifra Club,
 * transposta para o tom real (Db; no site: forma de C com capotraste na 1ª casa).
 * Atualiza se encontrar pelo título; senão insere.
 *
 * Uso:
 *   node scripts/import-da-vida-o-melhor.mjs
 *   node scripts/import-da-vida-o-melhor.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TITLE = 'Da Vida, o Melhor';
const TONE = 'Db';
const COMPOSITION = 'Guilherme Iamarino';
const TAG = 'Projeto Sola';
const LINKS = [
  { label: 'Cifra Club', url: 'https://www.cifraclub.com.br/projeto-sola/da-vida-o-melhor/' },
  { label: 'Letras', url: 'https://www.letras.mus.br/projeto-sola/da-vida-o-melhor/' },
  { label: 'YouTube', url: 'https://www.youtube.com/watch?v=wEO1YRxqG1A' },
];

const LYRICS = `[INTRO]
[Db] [Gb] [Bbm] [Ab] [Gb]

[ESTROFE]
[Gb]N[Bbm]ova [Ab]vida
[Gb][Bbm]Para [Ab]sempre
[Gb][Bbm]Uma fam[Ab]ília
[Gb][Bbm]Ale--[Ab]gria

[Gb]Oh--[Bbm]oh--[Ab]oh
[Gb]Oh--[Bbm]oh--[Ab]oh

[ESTROFE]
[Gb][Bbm]Cami[Ab]nhar
[Gb]O [Bbm]amor [Ab]buscar
[Gb]A[Bbm]pren[Ab]der
[Gb]A [Bbm]luz bri[Ab]lhar

[PRE_REFRAO]
Sa[Gb]ber que a gente [Bbm]pode cres[Ab]cer
Vi[Gb]ver, chorar, dan[Bbm]çar e se ale[Ab]grar
[Gb]Oh--[Bbm]oh--[Ab]oh (4x)

[REFRAO]
Para [Db]nós Ele [Ab]é da [Bbm]vida, o me[Fm]lhor
Nosso mo[Gb]ver e exis[Ab]tir, para[Gb/Bb]íso a[Ab]qui
Só a [Db]Ele entre[Ab]gar o [Bbm]princípio e [Fm]o fim
Do uni[Gb]verso o [Ab]Rei, do [Gb/Bb]mundo a [Ab]luz

[INTERLUDIO]
[Bbm] [Gb/Db] [Db] [Ab4]

[PONTE]
[Bbm]Vida, ver[Gb]dade, ca[Db]minho e [Ab]paz
[Bbm]Luz sobre as [Gb]trevas, [Db]Reden[Ab]tor
[Bbm]Vida, ver[Gb]dade, ca[Db]minho e [Ab]paz
[Bbm]Luz sobre as [Gb]trevas, [Db]Reden[Ab]tor

Nos[Bbm]so refúgio, [Gb]fortaleza
[Db]Nossa força [Ab]nas batalhas
[Bbm]O perfeito [Gb]sacrifício
[Db]Verbo em carne, [Ab]Rei dos reis

[PONTE]
[Bbm]Vida, ver[Gb]dade, ca[Db]minho e [Ab]paz
[Bbm]Luz sobre as [Gb]trevas, [Db]Reden[Ab]tor

Nos[Bbm]so refúgio, [Gb]fortaleza
[Db]Nossa força [Ab]nas batalhas
[Bbm]O perfeito [Gb]sacrifício
[Db]Verbo em carne, [Ab]Rei dos reis

Nos[Bbm]so refúgio, [Gb]fortaleza
[Db]Nossa força [Ab]nas batalhas
[Bbm]O perfeito [Gb]sacrifício
[Db]Verbo em carne, [Ab]Rei dos reis

[REFRAO]
Para [Db]nós Ele [Ab]é da [Bbm]vida, o me[Fm]lhor
Nosso mo[Gb]ver e exis[Ab]tir, para[Gb/Bb]íso a[Ab]qui
Só a [Db]Ele entre[Ab]gar o [Bbm]princípio e [Fm]o fim
Do uni[Gb]verso o [Ab]Rei, do [Gb/Bb]mundo a [Ab]luz [Db]`;

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
    .ilike('title', '%vida%melhor%');
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
