import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventCount = await prisma.streamingEvent.count({ where: { userId: user.userId } });

  return NextResponse.json({
    user: { id: user.userId, username: user.username, email: user.email, eventCount },
  });
}
