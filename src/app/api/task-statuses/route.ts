import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We no longer need to check query params since we use session.organizationId
    const orgId = user.organizationId;

    const statuses = await prisma.taskStatus.findMany({
      where: { organizationId: orgId },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json(statuses);
  } catch (error: any) {
    console.error("GET task-statuses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: "Unauthorized. Only owners can create statuses." }, { status: 401 });
    }

    const body = await req.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const orgId = user.organizationId;

    // Check if status with name already exists in org
    const existing = await prisma.taskStatus.findFirst({
      where: { name, organizationId: orgId }
    });

    if (existing) {
      return NextResponse.json({ error: "A status with this name already exists" }, { status: 400 });
    }

    const maxOrder = await prisma.taskStatus.findFirst({
      where: { organizationId: orgId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });
    
    const newOrder = maxOrder ? maxOrder.order + 1 : 0;

    const status = await prisma.taskStatus.create({
      data: {
        name,
        color: color || '#64748b',
        order: newOrder,
        organizationId: orgId,
        createdByOwner: user.role === 'OWNER'
      }
    });

    return NextResponse.json(status);
  } catch (error: any) {
    console.error("POST task-statuses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
