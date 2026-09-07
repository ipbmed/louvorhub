import { readFileSync, writeFileSync } from 'node:fs';

const lyrics = readFileSync('tmp/adoramos-final.txt', 'utf8').trim();
const sql = `-- Cântico Adoramos o Cordeiro (Diante do Trono) — cifra Cifra Club, tom D
update public.songs
set
  lyrics_md = $lyrics$${lyrics}$lyrics$,
  musical_key = 'D',
  composition = 'Dennis Jernigan / Ana Paula Valadão',
  reviewed = true,
  updated_at = now()
where title ilike 'Adoramos o Cordeiro';
`;
writeFileSync('supabase/migrations/20260907150000_adoramos_o_cordeiro.sql', sql);
console.log('migration written', sql.length);
