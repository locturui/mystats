import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { resolveImageKeys } from '@/lib/images';

export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req);
  if (!user) return NextResponse.json({}, { status: 401 });

  const keysParam = req.nextUrl.searchParams.get('keys') ?? '';
  const keys = keysParam.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) return NextResponse.json({});

  const resolved = await resolveImageKeys(keys);
  const result: Record<string, string | null> = {};
  for (const [key, url] of resolved) result[key] = url;

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
