import { NextRequest, NextResponse } from 'next/server';
import { markNotificationReadAction } from '@/app/actions/notifications';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const res = await markNotificationReadAction(params.id);
  if (res.error) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
