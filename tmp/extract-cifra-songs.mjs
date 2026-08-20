import fs from 'node:fs';

const h = fs.readFileSync('tmp/cifra-list.html', 'utf8');
const marker = 'artistSongs\\":[';
const start = h.indexOf(marker);
if (start < 0) throw new Error('not found');

// Content starts at the [
let i = start + 'artistSongs\\":'.length;
let depth = 0;
let end = -1;
for (; i < h.length; i++) {
  const c = h[i];
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}

const escaped = h.slice(start + 'artistSongs\\":'.length, end);
// It's JSON-escaped inside a JS string: \" becomes "
const unescaped = JSON.parse(`"${escaped.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/"/g, '\\"')}"`);
// That approach is messy. Better: replace \" with " carefully.
const jsonText = escaped.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const songs = JSON.parse(jsonText);
console.log('songs', songs.length);
console.log(JSON.stringify(songs[0], null, 2));
fs.writeFileSync('tmp/cifra-songs.json', JSON.stringify(songs, null, 2));
