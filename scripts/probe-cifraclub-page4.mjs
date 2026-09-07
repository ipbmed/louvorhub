import { readFileSync } from 'node:fs';

const h = readFileSync('tmp/koinonya-sample.html', 'utf8');
const ids = [...h.matchAll(/i\.ytimg\.com\/vi(?:_webp)?\/([\w-]{6,})/g)].map((m) => m[1]);
console.log('yt ids', [...new Set(ids)]);

const spotify = [...h.matchAll(/spotify\.com\/(?:track|album|playlist|artist|search)\/[^\s"'<>\\]+/gi)];
console.log('spotify', spotify.map((m) => m[0]).slice(0, 10));

// any other media ids
const youtubeWatch = [...h.matchAll(/youtube\.com\/watch\?v=([\w-]{6,})/gi)].map((m) => m[1]);
console.log('watch ids', [...new Set(youtubeWatch)]);
