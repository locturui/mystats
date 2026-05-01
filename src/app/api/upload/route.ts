import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import Busboy from 'busboy';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { getAuthUserFromRequest } from '@/lib/auth';

interface ExtendedRecord {
  ts: string;
  platform?: string;
  ms_played: number;
  conn_country?: string;
  master_metadata_track_name?: string;
  master_metadata_album_artist_name?: string;
  master_metadata_album_album_name?: string;
  spotify_track_uri?: string;
  episode_name?: string;
  episode_show_name?: string;
  spotify_episode_uri?: string;
  reason_start?: string;
  reason_end?: string;
  shuffle?: boolean;
  skipped?: boolean;
  offline?: boolean;
  incognito_mode?: boolean;
}

interface LegacyRecord {
  endTime: string;
  artistName?: string;
  trackName?: string;
  msPlayed: number;
}

function computeHash(userId: string, ts: string, trackUri: string, episodeUri: string): string {
  return createHash('sha256')
    .update(`${userId}:${ts}:${trackUri}:${episodeUri}`)
    .digest('hex');
}

function parseExtended(userId: string, records: ExtendedRecord[]) {
  return records.map((r) => {
    const trackUri = r.spotify_track_uri ?? '';
    const episodeUri = r.spotify_episode_uri ?? '';
    return {
      recordHash: computeHash(userId, r.ts, trackUri, episodeUri),
      userId,
      ts: new Date(r.ts),
      platform: r.platform ?? null,
      msPlayed: r.ms_played ?? 0,
      connCountry: r.conn_country ?? null,
      trackName: r.master_metadata_track_name ?? null,
      artistName: r.master_metadata_album_artist_name ?? null,
      albumName: r.master_metadata_album_album_name ?? null,
      trackUri: r.spotify_track_uri ?? null,
      episodeName: r.episode_name ?? null,
      episodeShowName: r.episode_show_name ?? null,
      episodeUri: r.spotify_episode_uri ?? null,
      reasonStart: r.reason_start ?? null,
      reasonEnd: r.reason_end ?? null,
      shuffle: r.shuffle ?? false,
      skipped: r.skipped ?? false,
      offline: r.offline ?? false,
      incognitoMode: r.incognito_mode ?? false,
      isrc: null as string | null,
    };
  });
}

function parseLegacy(userId: string, records: LegacyRecord[]) {
  return records.map((r) => {
    const ts = r.endTime.includes('T') ? r.endTime : r.endTime.replace(' ', 'T') + ':00Z';
    return {
      recordHash: computeHash(userId, ts, '', ''),
      userId,
      ts: new Date(ts),
      platform: null,
      msPlayed: r.msPlayed ?? 0,
      connCountry: null,
      trackName: r.trackName ?? null,
      artistName: r.artistName ?? null,
      albumName: null,
      trackUri: null,
      episodeName: null,
      episodeShowName: null,
      episodeUri: null,
      reasonStart: null,
      reasonEnd: null,
      shuffle: false,
      skipped: false,
      offline: false,
      incognitoMode: false,
      isrc: null as string | null,
    };
  });
}

const CHUNK_SIZE = 500;

async function insertChunked(events: ReturnType<typeof parseExtended>) {
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < events.length; i += CHUNK_SIZE) {
    const chunk = events.slice(i, i + CHUNK_SIZE);
    const hashes = chunk.map((e) => e.recordHash);
    const existing = await prisma.streamingEvent.findMany({
      where: { recordHash: { in: hashes } },
      select: { recordHash: true },
    });
    const existingSet = new Set(existing.map((e) => e.recordHash));
    const seen = new Set<string>();
    const newEvents = chunk.filter((e) => {
      if (existingSet.has(e.recordHash) || seen.has(e.recordHash)) return false;
      seen.add(e.recordHash);
      return true;
    });
    if (newEvents.length > 0) {
      await prisma.streamingEvent.createMany({ data: newEvents });
    }
    inserted += newEvents.length;
    skipped += chunk.length - newEvents.length;
  }
  return { inserted, skipped };
}

async function parseUploadedFile(request: Request): Promise<{ name: string; data: Buffer } | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!request.body) return null;

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: typeof resolve | typeof reject, val: Parameters<typeof resolve>[0] | Parameters<typeof reject>[0]) => {
      if (!settled) { settled = true; (fn as (v: unknown) => void)(val); }
    };

    const bb = Busboy({ headers: { 'content-type': contentType } });
    let result: { name: string; data: Buffer } | null = null;

    bb.on('file', (_field, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => { result = { name: info.filename, data: Buffer.concat(chunks) }; });
      stream.on('error', (err) => done(reject, err));
    });

    bb.on('finish', () => done(resolve, result));
    bb.on('error', (err) => done(reject, err));

    const nodeReadable = Readable.fromWeb(request.body as import('stream/web').ReadableStream);
    nodeReadable.on('error', (err) => done(reject, err));
    nodeReadable.pipe(bb);
  });
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authUser.userId;

    const file = await parseUploadedFile(request);
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Please upload a .zip file' }, { status: 400 });
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('encrypt')) {
        return NextResponse.json(
          { error: 'ZIP file is password-protected. Please upload an unencrypted ZIP. Spotify data exports are not password-protected.' },
          { status: 422 }
        );
      }
      throw e;
    }

    const fileNames = Object.keys(zip.files).filter(
      (n) => !zip.files[n].dir
        && !n.startsWith('__MACOSX/')
        && !n.includes('/._')
        && !n.startsWith('._')
    );

    const extendedFiles = fileNames.filter(
      (n) => /Streaming_History_Audio.*\.json$/i.test(n)
    );
    const legacyFiles = fileNames.filter(
      (n) => /StreamingHistory_music.*\.json$/i.test(n)
    );

    if (extendedFiles.length === 0 && legacyFiles.length === 0) {
      return NextResponse.json(
        { error: 'No Spotify streaming history JSON files found in the ZIP' },
        { status: 422 }
      );
    }

    let totalInserted = 0;
    let totalSkipped = 0;
    const filesProcessed: string[] = [];

    const fixJsonString = (s: string): string => {
      let c = s.replace(/^[\uFEFF\uFFFE\u0000\r\n\t ]+/, '');
      if (c.charAt(0) !== '[' && c.charAt(0) !== '{') {
        const i = Math.min(
          ...[c.indexOf('['), c.indexOf('{')].filter((n) => n !== -1)
        );
        if (isFinite(i)) c = c.slice(i);
      }
      return c;
    };

    for (const fileName of extendedFiles) {
      const content = fixJsonString(await zip.files[fileName].async('text'));
      const records: ExtendedRecord[] = JSON.parse(content);
      const events = parseExtended(userId, records);

      const { inserted, skipped } = await insertChunked(events);
      totalInserted += inserted;
      totalSkipped += skipped;
      filesProcessed.push(fileName.split('/').pop() ?? fileName);
    }

    for (const fileName of legacyFiles) {
      const content = fixJsonString(await zip.files[fileName].async('text'));
      const records: LegacyRecord[] = JSON.parse(content);
      const events = parseLegacy(userId, records);
      const { inserted, skipped } = await insertChunked(events);
      totalInserted += inserted;
      totalSkipped += skipped;
      filesProcessed.push(fileName.split('/').pop() ?? fileName);
    }

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      filesProcessed,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process ZIP file' }, { status: 500 });
  }
}
