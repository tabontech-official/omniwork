'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { TimeEntryType, TimeEntryStatus } from '@prisma/client';

export type TimesheetFilters = {
  startDate: string;
  endDate: string;
  memberId?: string;
  projectId?: string;
  taskId?: string;
  status?: string;
  entryType?: string;
};

export async function getTimesheetAction(filters: TimesheetFilters) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { startDate, endDate, memberId, projectId, taskId, status, entryType } = filters;

    if (!startDate || !endDate) {
      return { error: 'Start Date and End Date are required.' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    // End date should be inclusive of the full day
    end.setHours(23, 59, 59, 999);

    if (end < start) {
      return { error: 'End Date cannot be before Start Date.' };
    }

    // Base WHERE clause
    const whereClause: any = {
      organizationId: session.organizationId,
      startTime: {
        gte: start,
        lte: end,
      },
    };

    // Apply role-based restrictions
    if (session.role === 'OWNER') {
      // Owner sees all organization entries. No extra restriction needed.
    } else if (session.role === 'MEMBER') {
      // Is PM check: We need to see if they are filtering for a managed project
      // If a member is a PM of some projects, they can see ALL entries for those projects OR their own entries.
      whereClause.OR = [
        { memberId: session.userId },
        { project: { projectManagerId: session.userId } }
      ];
    } else if (session.role === 'CLIENT') {
      whereClause.project = {
        clientId: session.userId
      };
    }

    // Apply user filters (ensure we don't override role restrictions)
    if (projectId) {
      if (whereClause.project) {
        whereClause.project.id = projectId; // Merging restrictions safely for CLIENT
      } else {
        whereClause.projectId = projectId;
      }
    }
    
    if (taskId) {
      whereClause.taskId = taskId;
    }

    if (status && status !== 'ALL') {
      whereClause.status = status as TimeEntryStatus;
    }

    if (entryType && entryType !== 'ALL') {
      whereClause.entryType = entryType as TimeEntryType;
    }

    if (memberId) {
      // If a MEMBER explicitly filters by another memberId, they might get empty results 
      // if they aren't the PM of the related projects. The OR clause handles this natively.
      whereClause.memberId = memberId;
    }

    const entries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, name: true, projectManagerId: true, clientId: true }
        },
        task: {
          select: { id: true, title: true }
        },
        member: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    return { success: true, entries };
  } catch (error: any) {
    console.error('Failed to get timesheet:', error);
    return { error: error.message || 'Failed to retrieve timesheet data.' };
  }
}
