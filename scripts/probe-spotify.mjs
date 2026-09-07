const title = 'Flua';
const artist = 'Ministério Koinonya de Louvor';
const q = encodeURIComponent(`${title} ${artist}`);
const urls = [
  `https://open.spotify.com/search/${q}`,
  `https://open.spotify.com/search/${q}/tracks`,
];
for (const u of urls) {
  const res = await fetch(u, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  });
  const h = await res.text();
  const tracks = [...h.matchAll(/\/track\/([a-zA-Z0-9]{22})/g)].map((m) => m[1]);
  const entities = [...h.matchAll(/spotify:track:([a-zA-Z0-9]{22})/g)].map((m) => m[1]);
  console.log(u, 'status', res.status, 'len', h.length, 'tracks', [...new Set(tracks)].slice(0, 3), 'entities', [...new Set(entities)].slice(0, 3));
}
