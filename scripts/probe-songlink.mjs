const yt = 'https://www.youtube.com/watch?v=L8UeZIKZ_yw';
const api = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(yt)}&userCountry=BR`;
const res = await fetch(api, {
  headers: { 'User-Agent': 'Mozilla/5.0 LouvorHubSync/1.0' },
});
const data = await res.json();
console.log('status', res.status);
console.log('spotify', data?.linksByPlatform?.spotify);
console.log('platforms', Object.keys(data?.linksByPlatform || {}));
