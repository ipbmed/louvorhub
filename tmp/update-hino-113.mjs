/**
 * Atualiza a letra/cifra do Hino 113 no Supabase.
 * Uso: npx tsx scripts/update-hino-113.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
  console.error('Defina VITE_SUPABASE_URL e uma chave (service role preferível).');
  process.exit(1);
}

const lyrics = readFileSync(resolve(process.cwd(), 'tmp/hino113-lyrics.txt'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\n+$/, '');

const sb = createClient(url, key);

const { data, error } = await sb
  .from('songs')
  .update({
    lyrics_md: lyrics,
    title: 'Achei um bom amigo',
    updated_at: new Date().toISOString(),
  })
  .eq('kind', 'hino')
  .eq('number', 113)
  .select('id, number, title');

if (error) {
  console.error('Falha ao atualizar:', error.message);
  process.exit(1);
}

if (!data?.length) {
  console.error('Nenhum hino #113 encontrado.');
  process.exit(1);
}

console.log('Hino 113 atualizado:', data);
