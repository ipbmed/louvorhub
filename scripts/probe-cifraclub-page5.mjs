import { readFileSync } from 'node:fs';
const h = readFileSync('tmp/koinonya-sample.html', 'utf8');
const idx = h.indexOf('L8UeZIKZ_yw');
console.log(h.slice(idx - 300, idx + 400).replace(/\s+/g, ' '));
