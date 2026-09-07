import { readFileSync } from 'node:fs';

const h = readFileSync('tmp/koinonya-sample.html', 'utf8');

const schema = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
for (const block of schema) {
  const json = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
  try {
    const data = JSON.parse(json);
    console.log('LD keys', Object.keys(data), JSON.stringify(data).slice(0, 500));
  } catch {
    console.log('LD parse fail', json.slice(0, 200));
  }
}

// look near "Clipe" "Mídia" "spotify" "oEmbed"
for (const n of ['Clipe', 'Mídia', 'midia', 'spotify', 'track', 'video', 'player', 'i.ytimg', 'watch?v']) {
  let from = 0;
  let count = 0;
  const lower = h.toLowerCase();
  const needle = n.toLowerCase();
  while (count < 3) {
    const idx = lower.indexOf(needle, from);
    if (idx < 0) break;
    console.log('\n==', n, idx);
    console.log(h.slice(idx, idx + 200).replace(/\s+/g, ' '));
    from = idx + needle.length;
    count++;
  }
}

const toneBtn = h.match(/data-anchor="--chord-tone"[^>]*>([^<]+)</);
console.log('\ntone btn', toneBtn?.[1]);

const tomLabel = h.match(/Tom[^<]{0,40}([A-G][#b]?m?)/);
console.log('tom label', tomLabel?.[0], tomLabel?.[1]);
