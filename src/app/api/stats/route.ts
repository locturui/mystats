import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAllStats } from '@/lib/stats';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');
    const startDate = startParam ? new Date(startParam) : undefined;
    const endDate = endParam ? new Date(endParam) : undefined;

    const stats = await getAllStats({ userId: user.userId, year, startDate, endDate });

    const serialized = JSON.parse(
      JSON.stringify(stats, (_, v) => (typeof v === 'bigint' ? Number(v) : v))
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
