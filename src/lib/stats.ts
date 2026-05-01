import { prisma } from './db';

export interface StatsFilter {
  userId: string;
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

function yearFilter(filter: StatsFilter) {
  if (filter.startDate && filter.endDate) {
    return { ts: { gte: filter.startDate, lte: filter.endDate } };
  }
  if (!filter.year) return {};
  return {
    ts: {
      gte: new Date(`${filter.year}-01-01`),
      lt: new Date(`${filter.year + 1}-01-01`),
    },
  };
}

function yearWhereClause(filter: StatsFilter) {
  if (filter.startDate && filter.endDate) {
    return `AND ts >= '${filter.startDate.toISOString()}'::timestamptz AND ts <= '${filter.endDate.toISOString()}'::timestamptz`;
  }
  if (!filter.year) return '';
  return `AND ts >= '${filter.year}-01-01'::timestamptz AND ts < '${filter.year + 1}-01-01'::timestamptz`;
}

export async function getOverview(filter: StatsFilter) {
  const where = { userId: filter.userId, ...yearFilter(filter) };

  const [agg, uniqueArtists, uniqueTracks, uniqueAlbums, firstLast] = await Promise.all([
    prisma.streamingEvent.aggregate({
      where,
      _sum: { msPlayed: true },
      _count: { id: true },
    }),
    prisma.streamingEvent.findMany({
      where: { ...where, artistName: { not: null } },
      distinct: ['artistName'],
      select: { artistName: true },
    }),
    prisma.streamingEvent.findMany({
      where: { ...where, trackUri: { not: null } },
      distinct: ['trackUri'],
      select: { trackUri: true },
    }),
    prisma.streamingEvent.findMany({
      where: { ...where, albumName: { not: null } },
      distinct: ['albumName'],
      select: { albumName: true },
    }),
    prisma.streamingEvent.findFirst({
      where,
      orderBy: { ts: 'asc' },
      select: { ts: true },
    }),
  ]);

  const lastEvent = await prisma.streamingEvent.findFirst({
    where,
    orderBy: { ts: 'desc' },
    select: { ts: true },
  });

  const totalSkipped = await prisma.streamingEvent.count({
    where: { ...where, skipped: true },
  });

  return {
    totalMs: agg._sum.msPlayed ?? 0,
    totalPlays: agg._count.id,
    uniqueArtists: uniqueArtists.length,
    uniqueTracks: uniqueTracks.length,
    uniqueAlbums: uniqueAlbums.length,
    skipRate: agg._count.id > 0 ? totalSkipped / agg._count.id : 0,
    firstListenDate: firstLast?.ts ?? null,
    lastListenDate: lastEvent?.ts ?? null,
  };
}

export async function getTopArtists(filter: StatsFilter, limit = 20) {
  const where = {
    userId: filter.userId,
    artistName: { not: null },
    trackUri: { not: null },
    ...yearFilter(filter),
  };

  const result = await prisma.streamingEvent.groupBy({
    by: ['artistName'],
    where,
    _sum: { msPlayed: true },
    _count: { id: true },
    orderBy: { _sum: { msPlayed: 'desc' } },
    take: limit,
  });

  return result.map((r) => ({
    artistName: r.artistName!,
    totalMs: r._sum.msPlayed ?? 0,
    playCount: r._count.id,
  }));
}

export async function getTopTracks(filter: StatsFilter, limit = 20) {
  const where = {
    userId: filter.userId,
    trackUri: { not: null },
    ...yearFilter(filter),
  };

  const result = await prisma.streamingEvent.groupBy({
    by: ['trackUri', 'trackName', 'artistName', 'albumName'],
    where,
    _sum: { msPlayed: true },
    _count: { id: true },
    orderBy: { _sum: { msPlayed: 'desc' } },
    take: limit,
  });

  return result.map((r) => ({
    trackUri: r.trackUri!,
    trackName: r.trackName ?? 'Unknown Track',
    artistName: r.artistName ?? 'Unknown Artist',
    albumName: r.albumName ?? 'Unknown Album',
    totalMs: r._sum.msPlayed ?? 0,
    playCount: r._count.id,
  }));
}

export async function getTopAlbums(filter: StatsFilter, limit = 20) {
  const where = {
    userId: filter.userId,
    albumName: { not: null },
    trackUri: { not: null },
    ...yearFilter(filter),
  };

  const result = await prisma.streamingEvent.groupBy({
    by: ['albumName', 'artistName'],
    where,
    _sum: { msPlayed: true },
    _count: { id: true },
    orderBy: { _sum: { msPlayed: 'desc' } },
    take: limit,
  });

  return result.map((r) => ({
    albumName: r.albumName!,
    artistName: r.artistName ?? 'Unknown Artist',
    totalMs: r._sum.msPlayed ?? 0,
    playCount: r._count.id,
  }));
}

export async function getYearlyData(filter: StatsFilter) {
  const rows = await prisma.$queryRaw<{ year: number; totalMs: bigint; playCount: bigint }[]>`
    SELECT
      EXTRACT(YEAR FROM ts)::INTEGER as year,
      SUM("msPlayed") as "totalMs",
      COUNT(*) as "playCount"
    FROM "StreamingEvent"
    WHERE "userId" = ${filter.userId}
    GROUP BY year
    ORDER BY year ASC
  `;
  return rows.map((r) => ({
    year: Number(r.year),
    totalMs: Number(r.totalMs),
    playCount: Number(r.playCount),
  }));
}

export async function getMonthlyData(filter: StatsFilter) {
  const whereClause = yearWhereClause(filter);

  const rows = await prisma.$queryRawUnsafe<
    { year: number; month: number; totalMs: bigint; playCount: bigint }[]
  >(`
    SELECT
      EXTRACT(YEAR FROM ts)::INTEGER as year,
      EXTRACT(MONTH FROM ts)::INTEGER as month,
      SUM("msPlayed") as "totalMs",
      COUNT(*) as "playCount"
    FROM "StreamingEvent"
    WHERE "userId" = '${filter.userId}' ${whereClause}
    GROUP BY year, month
    ORDER BY year ASC, month ASC
  `);

  return rows.map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    totalMs: Number(r.totalMs),
    playCount: Number(r.playCount),
  }));
}

export async function getHourlyData(filter: StatsFilter) {
  const whereClause = yearWhereClause(filter);

  const rows = await prisma.$queryRawUnsafe<{ hour: number; totalMs: bigint; playCount: bigint }[]>(`
    SELECT
      EXTRACT(HOUR FROM ts)::INTEGER as hour,
      SUM("msPlayed") as "totalMs",
      COUNT(*) as "playCount"
    FROM "StreamingEvent"
    WHERE "userId" = '${filter.userId}' ${whereClause}
    GROUP BY hour
    ORDER BY hour ASC
  `);

  const hourMap = new Map(rows.map((r) => [Number(r.hour), { totalMs: Number(r.totalMs), playCount: Number(r.playCount) }]));
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    totalMs: hourMap.get(i)?.totalMs ?? 0,
    playCount: hourMap.get(i)?.playCount ?? 0,
  }));
}

export async function getDayOfWeekData(filter: StatsFilter) {
  const whereClause = yearWhereClause(filter);

  const rows = await prisma.$queryRawUnsafe<{ dow: number; totalMs: bigint; playCount: bigint }[]>(`
    SELECT
      EXTRACT(DOW FROM ts)::INTEGER as dow,
      SUM("msPlayed") as "totalMs",
      COUNT(*) as "playCount"
    FROM "StreamingEvent"
    WHERE "userId" = '${filter.userId}' ${whereClause}
    GROUP BY dow
    ORDER BY dow ASC
  `);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowMap = new Map(rows.map((r) => [Number(r.dow), { totalMs: Number(r.totalMs), playCount: Number(r.playCount) }]));
  return Array.from({ length: 7 }, (_, i) => ({
    dow: i,
    label: days[i],
    totalMs: dowMap.get(i)?.totalMs ?? 0,
    playCount: dowMap.get(i)?.playCount ?? 0,
  }));
}

function normalizePlatform(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (p === 'ios' || p.startsWith('ios ') || p.includes('iphone') || p.includes('ipad')) return 'iOS';
  if (p === 'macos' || p === 'osx' || p.startsWith('macos') || p.startsWith('mac os') || p.startsWith('os x') || p.startsWith('osx ')) return 'macOS';
  if (p === 'windows' || p.startsWith('windows')) return 'Windows';
  if (p.includes('android_tv') || p.includes('android tv') || p.includes('tpapi') || p.includes('mibox') || p.startsWith('partner ') || p.includes('cast')) return 'Android TV';
  if (p.startsWith('android')) return 'Android';
  if (p.includes('web') || p.includes('browser')) return 'Web Player';
  if (p.includes('linux')) return 'Linux';
  return raw.trim();
}

export async function getPlatformData(filter: StatsFilter) {
  const where = {
    userId: filter.userId,
    platform: { not: null },
    ...yearFilter(filter),
  };

  const result = await prisma.streamingEvent.groupBy({
    by: ['platform'],
    where,
    _sum: { msPlayed: true },
    _count: { id: true },
    orderBy: { _sum: { msPlayed: 'desc' } },
  });

  const merged = new Map<string, { totalMs: number; playCount: number }>();
  for (const r of result) {
    const key = normalizePlatform(r.platform!);
    const prev = merged.get(key) ?? { totalMs: 0, playCount: 0 };
    merged.set(key, {
      totalMs: prev.totalMs + (r._sum.msPlayed ?? 0),
      playCount: prev.playCount + r._count.id,
    });
  }

  return Array.from(merged.entries())
    .map(([platform, data]) => ({ platform, ...data }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

export async function getDailyHeatmap(filter: StatsFilter) {
  const whereClause = yearWhereClause(filter);

  const rows = await prisma.$queryRawUnsafe<{ date: string; totalMs: bigint; playCount: bigint }[]>(`
    SELECT
      to_char(ts, 'YYYY-MM-DD') as date,
      SUM("msPlayed") as "totalMs",
      COUNT(*) as "playCount"
    FROM "StreamingEvent"
    WHERE "userId" = '${filter.userId}' ${whereClause}
    GROUP BY to_char(ts, 'YYYY-MM-DD')
    ORDER BY date ASC
  `);

  return rows.map((r) => ({
    date: r.date,
    totalMs: Number(r.totalMs),
    playCount: Number(r.playCount),
  }));
}

export async function getAvailableYears(userId: string): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM ts)::INTEGER as year
    FROM "StreamingEvent"
    WHERE "userId" = ${userId}
    ORDER BY year ASC
  `;
  return rows.map((r) => Number(r.year));
}

export async function getAllStats(filter: StatsFilter) {
  const [
    overview,
    topArtists,
    topTracks,
    topAlbums,
    yearlyData,
    monthlyData,
    hourlyData,
    dowData,
    platformData,
    heatmapData,
    availableYears,
  ] = await Promise.all([
    getOverview(filter),
    getTopArtists(filter),
    getTopTracks(filter),
    getTopAlbums(filter),
    getYearlyData(filter),
    getMonthlyData(filter),
    getHourlyData(filter),
    getDayOfWeekData(filter),
    getPlatformData(filter),
    getDailyHeatmap(filter),
    getAvailableYears(filter.userId),
  ]);

  return {
    overview,
    topArtists,
    topTracks,
    topAlbums,
    yearlyData,
    monthlyData,
    hourlyData,
    dowData,
    platformData,
    heatmapData,
    availableYears,
  };
}

export type AllStats = Awaited<ReturnType<typeof getAllStats>>;
