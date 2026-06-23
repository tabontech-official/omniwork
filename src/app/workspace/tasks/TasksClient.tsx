'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Settings, Calendar, Clock, LayoutGrid, List } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { deleteTaskAction } from '@/app/actions/tasks';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import TaskFormModal from './TaskFormModal';
import StatusManagementModal from './StatusManagementModal';

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

export default function TasksClient({ initialTasks, taskStatuses, projects, users, currentUser }: { 
  initialTasks: any[], 
  taskStatuses: any[], 
  projects: any[], 
  users: any[], 
  currentUser: any 
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [isPending, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStatusManageOpen, setIsStatusManageOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const isClient = currentUser.role === 'CLIENT';
  const canCreateTask = currentUser.role === 'OWNER' || 
                        (currentUser.role === 'MEMBER' && projects.some(p => p.projectManagerId === currentUser.userId)) ||
                        isClient;
  const canManageStatuses = currentUser.role === 'OWNER';

  // For Client role, only show assignees who are actually assigned to tasks in their projects
  const availableUsers = isClient ? 
    users.filter(u => initialTasks.some(t => t.assignees.some((a: any) => a.userId === u.id))) 
    : users;

  // Filters
  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
    if (selectedStatusId !== 'all' && t.statusId !== selectedStatusId) return false;
    if (selectedAssigneeId !== 'all' && !t.assignees.some((a: any) => a.userId === selectedAssigneeId)) return false;
    return true;
  });

  const totalAllocated = filteredTasks.reduce((acc, t) => acc + (t.allocatedHours || 0), 0);
  const totalTracked = filteredTasks.reduce((acc, t) => acc + (t.trackedHours || 0), 0);
  const remainingHours = Math.max(0, totalAllocated - totalTracked);

  const handleDelete = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    startTransition(async () => {
      const res = await deleteTaskAction(taskId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task deleted successfully');
        setTasks(tasks.filter(t => t.id !== taskId));
        router.refresh();
      }
    });
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setIsCreateOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks, track hours, and monitor timelines.</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageStatuses && (
            <Button variant="outline" onClick={() => setIsStatusManageOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Statuses
            </Button>
          )}
          {canCreateTask && (
            <Button onClick={() => { setEditingTask(null); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Allocated Hours</span>
            <span className="text-2xl font-bold">{totalAllocated.toFixed(1)}h</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Tracked Hours</span>
            <span className="text-2xl font-bold">{totalTracked.toFixed(1)}h</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Remaining Hours</span>
            <span className="text-2xl font-bold">{remainingHours.toFixed(1)}h</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-8 w-full bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          value={selectedProjectId} 
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select 
          value={selectedStatusId} 
          onChange={(e) => setSelectedStatusId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          {taskStatuses.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          value={selectedAssigneeId} 
          onChange={(e) => setSelectedAssigneeId(e.target.value)}
          className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Assignees</option>
          {availableUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" className="px-2" onClick={() => setViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="sm" className="px-2" onClick={() => setViewMode('card')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No tasks found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map(task => (
                  <TableRow key={task.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium">{task.title}</div>
                      {task.dueDate && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar size={12} /> {formatDate(task.dueDate)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium hover:underline cursor-pointer" onClick={() => router.push(`/workspace/projects/${task.projectId}`)}>
                        {task.project.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.status ? (
                        <Badge variant="outline" style={{ borderColor: task.status.color, color: task.status.color, backgroundColor: `${task.status.color}10` }}>
                          {task.status.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Status</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getPriorityColor(task.priority)} border-transparent`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {task.assignees.map((a: any) => (
                          <div key={a.userId} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary" title={a.user.name}>
                            {a.user.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium text-emerald-600">{task.trackedHours || 0}h</span>
                        <span className="text-muted-foreground"> / {task.allocatedHours || '-'}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentUser.role !== 'CLIENT' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(task)}><Edit className="w-4 h-4 mr-2" /> Edit Task</DropdownMenuItem>
                            {(currentUser.role === 'OWNER' || task.project.projectManagerId === currentUser.userId) && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(task.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.length === 0 ? (
             <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-card">
               No tasks found matching your filters.
             </div>
          ) : (
            filteredTasks.map(task => (
              <Card key={task.id} className="hover:shadow-md transition-shadow relative group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
                    {currentUser.role !== 'CLIENT' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)}><Edit className="w-4 h-4 mr-2" /> Edit Task</DropdownMenuItem>
                          {(currentUser.role === 'OWNER' || task.project.projectManagerId === currentUser.userId) && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(task.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Task
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardDescription className="hover:underline cursor-pointer" onClick={() => router.push(`/workspace/projects/${task.projectId}`)}>
                    {task.project.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    {task.status ? (
                      <Badge variant="outline" style={{ borderColor: task.status.color, color: task.status.color, backgroundColor: `${task.status.color}10` }}>
                        {task.status.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Status</Badge>
                    )}
                    <Badge variant="secondary" className={`${getPriorityColor(task.priority)} border-transparent text-[10px]`}>
                      {task.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex -space-x-2">
                      {task.assignees.map((a: any) => (
                        <div key={a.userId} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center font-bold text-primary" title={a.user.name}>
                          {a.user.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-emerald-600">{task.trackedHours || 0}h</span>
                      <span className="text-muted-foreground">of {task.allocatedHours || '-'}h</span>
                    </div>
                  </div>
                  
                  {task.dueDate && (
                    <div className="pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} /> Due {formatDate(task.dueDate)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {isCreateOpen && (
        <TaskFormModal 
          isOpen={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
          task={editingTask} 
          projects={projects} 
          taskStatuses={taskStatuses} 
          users={users} 
          currentUser={currentUser}
          onSuccess={() => {
            setIsCreateOpen(false);
            setEditingTask(null);
            router.refresh();
          }}
        />
      )}

      {isStatusManageOpen && (
        <StatusManagementModal
          isOpen={isStatusManageOpen}
          onOpenChange={setIsStatusManageOpen}
          taskStatuses={taskStatuses}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
