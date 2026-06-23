import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activeTimerId, projectId, taskId, screenshotBase64 } = await req.json();

    if (!activeTimerId || !projectId || !screenshotBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process base64 string
    const base64Data = screenshotBase64.replace(/^data:image\/jpeg;base64,/, "");
    
    // Save to public/screenshots folder
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `${session.userId}-${Date.now()}.jpg`;
    const filepath = path.join(screenshotsDir, filename);

    fs.writeFileSync(filepath, base64Data, 'base64');

    const screenshotUrl = `/screenshots/${filename}`;

    const screenshot = await prisma.timeScreenshot.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        taskId: taskId || null,
        memberId: session.userId,
        activeTimerId,
        screenshotUrl,
        capturedAt: new Date(),
        activityLevel: 100, // Placeholder
      }
    });

    return NextResponse.json({ success: true, screenshot });
  } catch (error: any) {
    console.error('Screenshot upload failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
