import React from 'react';
import { getTasksAction, getTaskStatusesAction } from '@/app/actions/tasks';
import { getProjectsAction } from '@/app/actions/projects';
import { getUsersAction } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import TasksClient from './TasksClient';

export default async function TasksPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const [tasksRes, statusesRes, projectsRes, usersRes] = await Promise.all([
    getTasksAction(),
    getTaskStatusesAction(),
    getProjectsAction(),
    getUsersAction()
  ]);

  if (!tasksRes.success) {
    return <div className="p-6 text-destructive flex items-center justify-center h-64 border rounded-xl bg-background mt-6">Error loading tasks: {tasksRes.error}</div>;
  }

  const tasks = tasksRes.tasks || [];
  const taskStatuses = statusesRes.success ? (statusesRes.statuses || []) : [];
  const projects = projectsRes.success ? (projectsRes.projects || []) : [];
  const users = usersRes.success ? (usersRes.users || []) : [];

  return (
    <TasksClient 
      initialTasks={tasks} 
      taskStatuses={taskStatuses} 
      projects={projects} 
      users={users} 
      currentUser={currentUser} 
    />
  );
}
