import { prisma } from './db';

const CONCURRENCY = 5;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sanitizeQuery(s: string): string {
  return s.replace(/[*+\-&|!(){}[\]^~:"\\/]/g, '').replace(/\s+/g, ' ').trim();
}

function hasNonLatin(s: string): boolean {
  return /[^\u0000-\u024F\s]/.test(s);
}

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !/\/\/(25|50|10)\d+x\d+/.test(url);
}

async function deezerGet<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function fetchArtistImage(artist: string): Promise<string | null> {
  type Res = { data?: { picture_big?: string }[] };
  const data = await deezerGet<Res>(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(sanitizeQuery(artist))}&limit=1`
  );
  const url = data?.data?.[0]?.picture_big ?? null;
  return isValidImageUrl(url) ? url : null;
}

async function fetchAlbumCover(artist: string, album: string): Promise<string | null> {
  type Res = { data?: { cover_big?: string }[] };
  const data = await deezerGet<Res>(
    `https://api.deezer.com/search/album?q=${encodeURIComponent(`${sanitizeQuery(artist)} ${sanitizeQuery(album)}`)}&limit=1`
  );
  const url = data?.data?.[0]?.cover_big ?? null;
  return isValidImageUrl(url) ? url : null;
}

async function fetchTrackCover(artist: string, track: string): Promise<string | null> {
  type Res = { data?: { album?: { cover_big?: string } }[] };
  const sa = sanitizeQuery(artist);
  const st = sanitizeQuery(track);
  const q = (hasNonLatin(artist) || hasNonLatin(track))
    ? `${sa} ${st}`
    : `artist:"${sa}" track:"${st}"`;
  const data = await deezerGet<Res>(
    `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`
  );
  const url = data?.data?.[0]?.album?.cover_big ?? null;
  return isValidImageUrl(url) ? url : null;
}

async function resolveImages(
  items: Array<{ key: string; fetcher: () => Promise<string | null> }>
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (items.length === 0) return result;

  const keys = items.map((i) => i.key);
  const cached = await prisma.imageCache.findMany({ where: { cacheKey: { in: keys } } });
  const cachedSet = new Set(cached.map((c) => c.cacheKey));
  for (const c of cached) result.set(c.cacheKey, c.imageUrl ?? null);

  const uncached = items.filter((i) => !cachedSet.has(i.key));
  if (uncached.length === 0) return result;

  for (let i = 0; i < uncached.length; i += CONCURRENCY) {
    const batch = uncached.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(batch.map(({ key, fetcher }) =>
      fetcher().then((imageUrl) => ({ key, imageUrl }))
    ));
    for (const { key, imageUrl } of fetched) result.set(key, imageUrl);
    const toCache = fetched.filter(({ imageUrl }) => imageUrl !== null);
    if (toCache.length > 0) {
      try {
        await prisma.imageCache.createMany({
          data: toCache.map(({ key, imageUrl }) => ({ cacheKey: key, imageUrl })),
        });
      } catch {}
    }
    if (i + CONCURRENCY < uncached.length) await sleep(150);
  }

  return result;
}

export async function resolveImageKeys(keys: string[]): Promise<Map<string, string | null>> {
  const items = keys.map((key) => {
    const parts = key.split(':');
    const type = parts[0];
    let fetcher: () => Promise<string | null>;
    if (type === 'artist') {
      const name = parts.slice(1).join(':');
      fetcher = () => fetchArtistImage(name);
    } else if (type === 'track') {
      const artist = parts[1] ?? '';
      const track = parts.slice(2).join(':');
      fetcher = () => fetchTrackCover(artist, track);
    } else if (type === 'album') {
      const artist = parts[1] ?? '';
      const album = parts.slice(2).join(':');
      fetcher = () => fetchAlbumCover(artist, album);
    } else {
      fetcher = () => Promise.resolve(null);
    }
    return { key, fetcher };
  });
  return resolveImages(items);
}

export async function getArtistImages(artists: string[]): Promise<Map<string, string>> {
  const items = artists.map((a) => ({
    key: `artist:${a.toLowerCase()}`,
    fetcher: () => fetchArtistImage(a),
  }));
  const resolved = await resolveImages(items);
  const out = new Map<string, string>();
  for (const a of artists) {
    const url = resolved.get(`artist:${a.toLowerCase()}`);
    if (url) out.set(a, url);
  }
  return out;
}

export async function getTrackImages(
  tracks: Array<{ artistName: string; trackName: string }>
): Promise<Map<string, string>> {
  const items = tracks.map((t) => ({
    key: `track:${t.artistName.toLowerCase()}:${t.trackName.toLowerCase()}`,
    fetcher: () => fetchTrackCover(t.artistName, t.trackName),
  }));
  const resolved = await resolveImages(items);
  const out = new Map<string, string>();
  for (const t of tracks) {
    const key = `track:${t.artistName.toLowerCase()}:${t.trackName.toLowerCase()}`;
    const url = resolved.get(key);
    if (url) out.set(key, url);
  }
  return out;
}

export async function getAlbumImages(
  albums: Array<{ artistName: string; albumName: string }>
): Promise<Map<string, string>> {
  const items = albums.map((a) => ({
    key: `album:${a.artistName.toLowerCase()}:${a.albumName.toLowerCase()}`,
    fetcher: () => fetchAlbumCover(a.artistName, a.albumName),
  }));
  const resolved = await resolveImages(items);
  const out = new Map<string, string>();
  for (const a of albums) {
    const key = `album:${a.artistName.toLowerCase()}:${a.albumName.toLowerCase()}`;
    const url = resolved.get(key);
    if (url) out.set(key, url);
  }
  return out;
}
