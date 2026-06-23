'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Calendar, Clock, MoreHorizontal, Settings, 
  LayoutDashboard, CheckSquare, Users, Timer, Activity,
  Briefcase, MessageSquare, GripVertical, Plus, ShieldAlert
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { createTaskAction, updateTaskAction, deleteTaskAction } from '@/app/actions/tasks';
import { updateProjectAction } from '@/app/actions/projects';
import ProjectConversation from './ProjectConversation';

export default function ProjectDetailClient({ project, currentUser, users = [], taskStatuses = [] }: { project: any, currentUser: any, users?: any[], taskStatuses?: any[] }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskHours, setNewTaskHours] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  
  // Project Edit
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editIsOngoing, setEditIsOngoing] = useState(project.isOngoing);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(project.assignees.map((a: any) => a.userId));
  const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);
  
  const clients = users.filter(u => u.role === 'CLIENT' && u.status === 'ACTIVE');
  const members = users.filter(u => u.role === 'MEMBER' && u.status === 'ACTIVE');

  // Permissions
  const isOwner = currentUser.role === 'OWNER';
  const isPM = project.projectManagerId === currentUser.userId;
  const isClient = currentUser.role === 'CLIENT';
  const canManageTasks = isOwner || isPM || isClient; // As per rules: Clients can create tasks in own projects.

  // Metrics
  const totalTrackedMs = project.timeEntries.reduce((acc: number, t: any) => {
    return acc + (t.activeWorkedDuration || 0) * 1000;
  }, 0);
  const totalTrackedHours = Math.round((totalTrackedMs / (1000 * 60 * 60)) * 100) / 100;
  
  const progressPercent = project.totalAllocatedHours 
    ? Math.round((totalTrackedHours / project.totalAllocatedHours) * 100)
    : 0;

  async function handleUpdateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProjectAction(project.id, {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        notes: formData.get('notes') as string,
        clientId: formData.get('clientId') as string || undefined,
        projectManagerId: formData.get('projectManagerId') as string || undefined,
        status: formData.get('status') as any,
        priority: formData.get('priority') as any,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string || undefined,
        isOngoing: editIsOngoing,
        assigneeIds: selectedAssignees,
        projectBudget: formData.get('projectBudget') ? parseFloat(formData.get('projectBudget') as string) : undefined,
        totalAllocatedHours: formData.get('totalAllocatedHours') ? parseFloat(formData.get('totalAllocatedHours') as string) : undefined,
      });
      
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Project updated successfully');
        setIsEditProjectOpen(false);
        window.location.reload();
      }
    });
  }

  async function handleCreateTask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTaskName.trim()) return;

    const hours = newTaskHours ? parseFloat(newTaskHours) : undefined;

    startTransition(async () => {
      const res = await createTaskAction(
        project.id, 
        newTaskName, 
        newTaskDescription || undefined, 
        newTaskPriority as any,
        hours,
        undefined, // dueDate
        undefined, // statusId
        newTaskAssignees
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Task created successfully');
        setNewTaskName('');
        setNewTaskDescription('');
        setNewTaskHours('');
        setNewTaskPriority('MEDIUM');
        setNewTaskAssignees([]);
        setIsNewTaskModalOpen(false);
        window.location.reload();
      }
    });
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateTaskAction(taskId, { statusId: newStatus });
      if (res.error) toast.error(res.error);
      else window.location.reload();
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PLANNING': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ON_HOLD': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'COMPLETE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'LOW': return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
      case 'MEDIUM': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'HIGH': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'CRITICAL': return 'text-red-500 bg-red-100 dark:bg-red-900/30 font-bold';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-4 bg-background p-6 rounded-xl border shadow-sm">
        <Link href="/workspace/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit transition-colors">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className={getStatusColor(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className={getPriorityColor(project.priority)}>
                {project.priority}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-2 max-w-3xl">{project.description}</p>
            )}
          </div>
          {(isOwner || isPM) && (
            <>
              <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm">
                    <Settings className="mr-2 h-4 w-4" /> Edit Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProject} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></label>
                        <Input name="name" required defaultValue={project.name} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input name="description" defaultValue={project.description || ''} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Client</label>
                        <select name="clientId" defaultValue={project.clientId || ''} className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                          <option value="">No Client (Internal)</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project Manager</label>
                        <select name="projectManagerId" defaultValue={project.projectManagerId || ''} className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                          <option value="">Unassigned</option>
                          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <select name="status" defaultValue={project.status} className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                          <option value="PLANNING">Planning</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="COMPLETE">Complete</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select name="priority" defaultValue={project.priority} className="flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date <span className="text-destructive">*</span></label>
                        <Input name="startDate" type="date" required defaultValue={new Date(project.startDate).toISOString().split('T')[0]} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium">End Date</label>
                          <div className="flex items-center gap-1.5">
                            <input type="checkbox" id="edit-ongoing" checked={editIsOngoing} onChange={(e) => setEditIsOngoing(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary"/>
                            <label htmlFor="edit-ongoing" className="text-xs text-muted-foreground cursor-pointer">Ongoing</label>
                          </div>
                        </div>
                        {!editIsOngoing ? (
                          <Input name="endDate" type="date" required={!editIsOngoing} defaultValue={project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''} />
                        ) : (
                          <div className="flex h-9 w-full items-center justify-center rounded-md border bg-muted/50 text-xs text-muted-foreground italic">Project has no end date</div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project Budget ($)</label>
                        <Input name="projectBudget" type="number" step="0.01" min="0" defaultValue={project.projectBudget || ''} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Total Allocated Hours <span className="text-destructive">*</span></label>
                        <Input name="totalAllocatedHours" type="number" step="0.1" min="0" required defaultValue={project.totalAllocatedHours || ''} />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Assign Team Members</label>
                        <div 
                          onClick={() => setIsMemberSelectOpen(true)}
                          className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          {selectedAssignees.length === 0 ? (
                            <span className="text-muted-foreground">Click to select members...</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedAssignees.map(id => {
                                const member = members.find(m => m.id === id);
                                return member ? <Badge variant="secondary" key={id} className="text-xs font-normal">{member.name}</Badge> : null;
                              })}
                            </div>
                          )}
                          <Users className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? 'Saving...' : 'Update Project'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Select Members Modal (Sibling to avoid bubbling issues) */}
              <Dialog open={isMemberSelectOpen} onOpenChange={setIsMemberSelectOpen}>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Select Team Members</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto space-y-1 bg-background shadow-inner custom-scrollbar">
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No members available.</p>
                      ) : (
                        members.map(m => (
                          <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedAssignees.includes(m.id)}
                              onChange={() => {
                                setSelectedAssignees(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{m.name}</span>
                              <span className="text-xs text-muted-foreground">{m.email}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    <Button type="button" onClick={() => setIsMemberSelectOpen(false)} className="w-full">Done</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-background border shadow-sm p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2"><LayoutDashboard size={14}/> Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2"><CheckSquare size={14}/> Tasks <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{project.tasks.length}</Badge></TabsTrigger>
          {!isClient && <TabsTrigger value="team" className="flex items-center gap-2"><Users size={14}/> Team</TabsTrigger>}
          {!isClient && <TabsTrigger value="time" className="flex items-center gap-2"><Timer size={14}/> Time Tracking</TabsTrigger>}
          <TabsTrigger value="conversation" className="flex items-center gap-2"><MessageSquare size={14}/> Conversation</TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2"><Activity size={14}/> Activity</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Meta Info */}
            <Card className="col-span-1 shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">Client:</span>
                  <span className="col-span-2 font-medium">{project.client?.name || 'Internal'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">Manager:</span>
                  <span className="col-span-2">{project.projectManager?.name || 'Unassigned'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">Start Date:</span>
                  <span className="col-span-2">{new Date(project.startDate).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground font-medium col-span-1">End Date:</span>
                  <span className="col-span-2">{project.isOngoing ? 'Ongoing' : project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}</span>
                </div>
                {project.notes && (
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <span className="text-muted-foreground font-medium block mb-1">Notes:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-muted/50 p-2 rounded-md">
                      {project.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time & Progress */}
            <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <CardTitle className="text-lg">Progress & Hours</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-3xl font-bold tracking-tight">{totalTrackedHours} <span className="text-lg font-medium text-muted-foreground">hrs</span></p>
                    <p className="text-sm text-muted-foreground mt-1">Total Logged Time</p>
                  </div>
                  {project.totalAllocatedHours && (
                    <div className="text-right">
                      <p className="text-xl font-semibold">{project.totalAllocatedHours} <span className="text-sm font-medium text-muted-foreground">hrs</span></p>
                      <p className="text-sm text-muted-foreground mt-1">Allocated Budget</p>
                    </div>
                  )}
                </div>

                {project.totalAllocatedHours && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{progressPercent}% Complete</span>
                      {totalTrackedHours > project.totalAllocatedHours && (
                        <span className="text-destructive flex items-center"><ShieldAlert size={12} className="mr-1"/> Over Budget</span>
                      )}
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progressPercent > 100 ? 'bg-destructive' : 'bg-primary'}`} 
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          {canManageTasks && (
            <div className="flex justify-end mb-4">
              <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Create New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task Title</label>
                      <Input placeholder="e.g. Design Landing Page" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea 
                        placeholder="Add more details about this task..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newTaskDescription}
                        onChange={e => setNewTaskDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Allocated Hours</label>
                        <Input type="number" step="0.5" min="0" placeholder="e.g. 5.5" value={newTaskHours} onChange={e => setNewTaskHours(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assignees (Project Members)</label>
                      <div className="border rounded-md p-2 space-y-2 max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                        {project.assignees?.map((a: any) => (
                          <label key={a.userId} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors">
                            <input 
                              type="checkbox" 
                              checked={newTaskAssignees.includes(a.userId)}
                              onChange={(e) => {
                                if (e.target.checked) setNewTaskAssignees(prev => [...prev, a.userId]);
                                else setNewTaskAssignees(prev => prev.filter(id => id !== a.userId));
                              }}
                              className="rounded border-slate-300"
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{a.user.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{a.user.name}</span>
                          </label>
                        ))}
                        {(!project.assignees || project.assignees.length === 0) && (
                          <div className="text-xs text-muted-foreground text-center p-2">No members assigned to this project.</div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsNewTaskModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isPending || !newTaskName.trim()}>Create Task</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Simple Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {taskStatuses.map((status, index) => {
              const statusTasks = project.tasks.filter((t: any) => {
                if (t.statusId === status.id) return true;
                // If a task lacks a status, map it to the very first column by default
                if (!t.statusId && index === 0) return true;
                return false;
              });

              return (
                <div key={status.id} className="flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border shadow-sm">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color || '#cccccc' }}></div>
                      {status.name}
                    </h3>
                    <Badge variant="secondary">{statusTasks.length}</Badge>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {statusTasks.length === 0 ? (
                      <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                        No tasks
                      </div>
                    ) : (
                      statusTasks.map((t: any) => (
                        <div key={t.id} className="bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium leading-snug">{t.title}</p>
                                {t.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{t.description}</p>}
                                {t.allocatedHours && <p className="text-[10px] text-primary/80 font-medium mt-1">{t.allocatedHours} hrs allocated</p>}
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border leading-none shrink-0 ${
                              t.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 
                              t.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              t.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>{t.priority}</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pl-6">
                            <select 
                              value={t.statusId || taskStatuses[0]?.id || ''}
                              onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                              disabled={!canManageTasks || isPending}
                              className="text-[10px] font-medium bg-muted/50 border-0 rounded px-1.5 py-0.5"
                            >
                              {taskStatuses.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>

                            <div className="flex -space-x-1.5">
                              {t.assignees?.map((a: any) => (
                                <Avatar key={a.user.id} title={a.user.name} className="h-5 w-5 border-2 border-background">
                                  <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">{a.user.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* TEAM TAB */}
        {!isClient && (
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {project.projectManager && (
                <Card className="shadow-sm border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/10">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm ring-2 ring-purple-500/30">
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">{project.projectManager.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{project.projectManager.name}</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1"><ShieldAlert size={10}/> Project Manager</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {project.assignees.map((a: any) => (
                <Card key={a.user.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">{a.user.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{a.user.name}</p>
                      <p className="text-xs text-muted-foreground">{a.user.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* TIME TRACKING TAB */}
        {!isClient && (
          <TabsContent value="time" className="space-y-4">
            <Card className="shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>User</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.timeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No time logged yet.</TableCell>
                    </TableRow>
                  ) : (
                    project.timeEntries.map((log: any) => {
                      const h = log.activeWorkedDuration ? Math.round((log.activeWorkedDuration / 3600) * 100) / 100 : 0;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.member?.name}</TableCell>
                          <TableCell>{log.task?.title || 'General'}</TableCell>
                          <TableCell>{new Date(log.startTime).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{h} hrs</TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{log.description || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}

        {/* CONVERSATION TAB */}
        <TabsContent value="conversation" className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <ProjectConversation 
              projectId={project.id} 
              currentUser={currentUser} 
              organizationId={project.organizationId} 
              isClient={isClient}
            />
          </Card>
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="shadow-sm border-dashed">
            <CardContent className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Activity size={48} className="opacity-20" />
              <p>Activity feed is currently being tracked in the database and will be visualized in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
