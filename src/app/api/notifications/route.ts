import { NextRequest, NextResponse } from 'next/server';
import { getMyNotificationsAction } from '@/app/actions/notifications';

export async function GET(req: NextRequest) {
  const res = await getMyNotificationsAction();
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ notifications: res.notifications });
}
