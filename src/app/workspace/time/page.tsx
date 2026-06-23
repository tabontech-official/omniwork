import React from 'react';
import { getActiveTimerAction, getTimeEntriesAction } from '@/app/actions/tracking';
import { getMyAssignedTasksAction, getTasksAction } from '@/app/actions/tasks';
import { getCurrentUser } from '@/app/actions/auth';
import { getProjectsAction } from '@/app/actions/projects';
import { getUsersAction } from '@/app/actions/users';
import TimeClient from './TimeClient';
import { Timer } from 'lucide-react';

export default async function TimeTrackingPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="p-6">Unauthorized</div>;

  const [activeRes, entriesRes, assignedRes, projectsRes, usersRes, tasksRes] = await Promise.all([
    getActiveTimerAction(),
    getTimeEntriesAction(),
    getMyAssignedTasksAction(),
    getProjectsAction(),
    getUsersAction(),
    getTasksAction()
  ]);

  if (!activeRes.success || !entriesRes.success || !assignedRes.success) {
    return <div className="p-6 text-destructive">Error loading tracking data.</div>;
  }

  const activeTimer = activeRes.timer || null;
  const timeEntries = entriesRes.entries || [];
  const assignedTasks = assignedRes.tasks || [];
  const allProjects = projectsRes.success ? (projectsRes.projects || []) : [];
  const allUsers = usersRes.success ? (usersRes.users || []) : [];
  const allTasks = tasksRes.success ? (tasksRes.tasks || []) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Timer className="text-primary" size={28} />
          Time Tracking
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start a live timer for your tasks, monitor active timers, or log time manually.
        </p>
      </div>
      
      <TimeClient 
        initialActiveTimer={activeTimer}
        initialTimeEntries={timeEntries}
        assignedTasks={assignedTasks}
        allProjects={allProjects}
        allUsers={allUsers}
        allTasks={allTasks}
        userRole={user.role}
        userId={user.userId}
        organizationId={user.organizationId}
      />
    </div>
  );
}
