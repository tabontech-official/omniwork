import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-desktop-secret-key-123';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // Get the most recent distinct notes used by this user
    const entries = await prisma.timeEntry.findMany({
      where: {
        memberId: userId,
        notes: {
          not: null
        }
      },
      select: {
        notes: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // fetch a bunch, we will distinct them in memory
    });

    // Extract distinct non-empty notes
    const distinctNotes = new Set<string>();
    const memos: string[] = [];

    for (const e of entries) {
      if (e.notes && !distinctNotes.has(e.notes.trim()) && e.notes.trim() !== '') {
        distinctNotes.add(e.notes.trim());
        memos.push(e.notes.trim());
        if (memos.length >= 10) break; // keep only top 10 distinct
      }
    }

    return NextResponse.json({ success: true, memos });

  } catch (error: any) {
    console.error('Desktop memos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
