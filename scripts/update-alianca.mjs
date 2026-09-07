/**
 * Atualiza "Aliança" (Koinonya) a partir do Cifra Club.
 * Uso: node scripts/update-alianca.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_URL = 'https://www.cifraclub.com.br/ministerio-koinonya-de-louvor/alianca/';
const LYRICS_FILE = resolve(process.cwd(), 'tmp/alianca-final.txt');

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
  const lyrics = readFileSync(LYRICS_FILE, 'utf8').trim();
  const tone = 'C';

  const { data: songs, error } = await sb
    .from('songs')
    .select('id, title, kind, musical_key')
    .ilike('title', 'Aliança');
  if (error) throw error;

  let targets = songs || [];
  if (!targets.length) {
    const { data: near, error: nearErr } = await sb
      .from('songs')
      .select('id, title, kind, musical_key')
      .or('title.ilike.%Aliança%,title.ilike.%Alianca%')
      .limit(20);
    if (nearErr) throw nearErr;
    console.log('Próximas:', near);
    targets = (near || []).filter((s) => /^alian[cç]a$/i.test(s.title.trim()));
  }

  if (!targets.length) {
    console.error('Música não encontrada');
    process.exit(1);
  }

  for (const song of targets) {
    const { error: upErr } = await sb
      .from('songs')
      .update({
        lyrics_md: lyrics,
        musical_key: tone,
        composition: 'Bené Gomes',
        reviewed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', song.id);
    if (upErr) throw upErr;

    await sb.from('song_links').delete().eq('song_id', song.id).ilike('label', '%cifra%club%');
    const { data: existingLinks } = await sb
      .from('song_links')
      .select('sort_order')
      .eq('song_id', song.id)
      .order('sort_order', { ascending: false })
      .limit(1);
    const sortOrder = (existingLinks?.[0]?.sort_order ?? -1) + 1;
    const { error: linkErr } = await sb.from('song_links').insert({
      song_id: song.id,
      label: 'Cifra Club',
      url: PAGE_URL,
      sort_order: sortOrder,
    });
    if (linkErr) throw linkErr;

    console.log(`Atualizado: ${song.title} (${song.id}) — tom ${tone}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
