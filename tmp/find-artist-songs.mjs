import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-list.html', 'utf8');
const idx = h.indexOf('artistSongs');
console.log('idx', idx);
console.log(h.slice(idx - 20, idx + 300));

// Also try escaped
const idx2 = h.indexOf('artistSongs\\');
console.log('idx2', idx2);

// Find in script push
const m = h.match(/artistSongs.{0,80}/);
console.log('match', m && m[0]);
