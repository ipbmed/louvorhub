import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      const v = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await sb
  .from('songs')
  .select('number,title,musical_key,lyrics_md,song_links(label,url)')
  .eq('number', 113)
  .eq('kind', 'hino')
  .maybeSingle();
if (error) throw error;
console.log(
  JSON.stringify(
    {
      number: data.number,
      title: data.title,
      key: data.musical_key,
      links: data.song_links,
      lyricsPreview: data.lyrics_md.slice(0, 200),
    },
    null,
    2,
  ),
);
