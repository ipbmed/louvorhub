import { readFileSync, writeFileSync } from 'node:fs';

const lyrics = readFileSync('tmp/alianca-final.txt', 'utf8').trim();
const sql = `-- Cântico Aliança (Ministério Koinonya) — cifra Cifra Club, tom C
update public.songs
set
  lyrics_md = $lyrics$${lyrics}$lyrics$,
  musical_key = 'C',
  composition = 'Bené Gomes',
  reviewed = true,
  updated_at = now()
where title ilike 'Aliança';
`;
writeFileSync('supabase/migrations/20260907160000_alianca_lyrics.sql', sql);
console.log('migration written', sql.length);
