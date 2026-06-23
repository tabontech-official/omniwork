import { NextRequest, NextResponse } from 'next/server';
import { markAllNotificationsReadAction } from '@/app/actions/notifications';

export async function POST(req: NextRequest) {
  const res = await markAllNotificationsReadAction();
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
