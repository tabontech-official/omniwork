import React from 'react';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { getProjectsAction } from '@/app/actions/projects';
import { getUsersAction } from '@/app/actions/users';
import { getTasksAction } from '@/app/actions/tasks';
import TimesheetClient from './TimesheetClient';
import { FileText } from 'lucide-react';

export default async function TimesheetPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const [projectsRes, usersRes, tasksRes] = await Promise.all([
    getProjectsAction(),
    getUsersAction(),
    getTasksAction()
  ]);

  const projects = projectsRes.success ? (projectsRes.projects || []) : [];
  const users = usersRes.success ? (usersRes.users || []) : [];
  const tasks = tasksRes.success ? (tasksRes.tasks || []) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10 px-4 md:px-6 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="text-primary" size={28} />
            Timesheet
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate, filter, and export detailed time reports.
          </p>
        </div>
      </div>
      
      <TimesheetClient 
        currentUser={currentUser}
        projects={projects}
        users={users}
        tasks={tasks}
      />
    </div>
  );
}
