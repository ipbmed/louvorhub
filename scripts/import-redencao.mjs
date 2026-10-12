/**
 * Importa "Redenção" (Projeto Sola) — cifra do Cifra Club (tom D, sem capotraste),
 * letra conferida com o Letras.
 * Atualiza se encontrar a mesma música (cântico "Redenção" do Projeto Sola); senão insere.
 *
 * Uso:
 *   node scripts/import-redencao.mjs
 *   node scripts/import-redencao.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TITLE = 'Redenção';
const TONE = 'D';
const COMPOSITION = 'Guilherme Iamarino';
const TAG = 'Projeto Sola';
const LINKS = [
  { label: 'Cifra Club', url: 'https://www.cifraclub.com.br/projeto-sola/redencao/' },
  { label: 'Letras', url: 'https://www.letras.mus.br/projeto-sola/redencao/' },
  { label: 'YouTube', url: 'https://www.youtube.com/watch?v=ljUhhNeVrCU' },
];

const LYRICS = `[INTRO]
[G/D] [D] [G/D] [D]
[G/D] [D] [G/D] [D]

[ESTROFE]
Vivo, [D]hoje estou aqui
Pois Ele [G]decidiu me amar
E [A]en[Bm]tão eu posso livre [G]an[D]dar

[ESTROFE]
O Seu [D]sangue sobre mim
Me com[G]prou, me restaurou
Sem [Bm]culpa então me [G]tor[D]nou

[PRE_REFRAO]
O pas[G]sado já não mais
Tem po[G7M]der, pois novo sou
Nele [A]vou viver, posso [Bm]amar
Toda [G]morte e o sofrer
Não [A]me as[Bm]sustarão jamais
Pois foi [A]Ele quem venceu
Em meu lu[A]gar

[REFRAO]
Jesus [G]Cristo, Rei dos [D]reis
Nos [A]trouxe a reden[Bm]ção
A espe[G]rança retor[D]nou
Graça e [A]paz nos reve[Bm]lou

[INTERLUDIO]
[G/D] [D] [G/D] [D]
[G/D] [D] [G/D] [D]

[ESTROFE]
Vivo, [D]hoje estou aqui
Pois Ele [G]decidiu me amar
E en[Bm]tão eu posso livre [G]an[D]dar

[ESTROFE]
O Seu [D]sangue sobre mim
Me com[G]prou, me restaurou
Sem [Bm]culpa então me [G]tor[D]nou

[PRE_REFRAO]
O pas[G]sado já não mais
Tem po[G7M]der, pois novo sou
Nele [A]vou viver, posso [Bm]amar
Toda [G]morte e o sofrer
Não [A]me as[Bm]sustarão jamais
Pois foi [A]Ele quem venceu
Em meu lu[A]gar

[PONTE]:6x
[Bm]Tudo entregar, [D]vou me render
[A]Aos Seus pés vou [Em]me lançar

[PRE_REFRAO]
O pas[G]sado já não mais
Tem po[G7M]der, pois novo sou
Nele [A]vou viver, posso [Bm]amar
Toda [G]morte e o sofrer
Não [A]me as[Bm]sustarão jamais
Pois foi [A]Ele quem venceu
Em meu lu[A]gar

[REFRAO]:4x
Jesus [G]Cristo, Rei dos [D]reis
Nos [A]trouxe a reden[Bm]ção
A espe[G]rança retor[D]nou
Graça e [A]paz nos reve[Bm]lou [G/D] [D]`;

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
    .select('id, title, kind, tags, lyrics_md')
    .ilike('title', '%reden%');
  if (error) throw error;
  const match =
    existing?.find(
      (s) =>
        s.kind === 'cantico' &&
        normalize(s.title) === 'redencao' &&
        ((s.tags || []).includes(TAG) || normalize(s.lyrics_md).includes('decidiu me amar')),
    ) ?? null;

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
    console.log(
      'Similares no catálogo:',
      existing?.map(({ id, title, kind, tags }) => ({ id, title, kind, tags })),
    );
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
