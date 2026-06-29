'use client';

import React, { useState } from 'react';
import { ProjectStatusesTab } from './ProjectStatusesTab';
import { TaskStatusesTab } from './TaskStatusesTab';

export function SettingsTabsClient({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'project' | 'task' | 'security'>('project');

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('project')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'project'
                ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
          >
            Project Statuses
          </button>
          <button
            onClick={() => setActiveTab('task')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'task'
                ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
          >
            Task Statuses
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'security'
                ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
          >
            Security Profile
          </button>
        </nav>
      </div>

      <div className="mt-4 -mx-8">
        {activeTab === 'project' && <ProjectStatusesTab />}
        {activeTab === 'task' && <TaskStatusesTab />}
        {activeTab === 'security' && <div className="px-8">{children}</div>}
      </div>
    </div>
  );
}
