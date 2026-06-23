'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Square, Pause, AlertCircle, Image as ImageIcon, Camera, Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { startTimerAction, stopTimerAction, reportActivityAction, deleteTimeEntryAction } from '@/app/actions/tracking';
import { toast } from 'sonner';
import { ManualTimeModal } from './ManualTimeModal';
import { useRealtime } from '@/hooks/useRealtime';
import { useRouter } from 'next/navigation';

export default function TimeClient({ 
  initialActiveTimer, 
  initialTimeEntries, 
  assignedTasks,
  allProjects,
  allUsers,
  allTasks,
  userRole,
  userId,
  organizationId
}: { 
  initialActiveTimer: any, 
  initialTimeEntries: any[], 
  assignedTasks: any[],
  allProjects: any[],
  allUsers: any[],
  allTasks: any[],
  userRole: string,
  userId: string,
  organizationId: string
}) {
  const [activeTimer, setActiveTimer] = useState<any>(initialActiveTimer);
  const [timeEntries, setTimeEntries] = useState<any[]>(initialTimeEntries);
  const router = useRouter();

  // Listen to realtime updates for this user
  const channels = [{ taskId: undefined, projectId: undefined }]; // We just need user and org defaults
  const { lastEvent } = useRealtime(channels);

  useEffect(() => {
    if (lastEvent) {
      // Data changed in backend, refresh the page state
      router.refresh();
      // Notice: If we just use router.refresh(), it updates Server Components.
      // We might need to manually update state if initialTimeEntries don't auto-update.
    }
  }, [lastEvent, router]);

  // Sync initial props to state when router.refresh() provides new data
  useEffect(() => {
    setActiveTimer(initialActiveTimer);
    setTimeEntries(initialTimeEntries);
  }, [initialActiveTimer, initialTimeEntries]);
  
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    initialActiveTimer ? initialActiveTimer.activeWorkedDuration + initialActiveTimer.idleDuration : 0
  );

  const [isIdleLocally, setIsIdleLocally] = useState(false);

  // Video stream for screenshot
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer interval
  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds((prev: number) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Ping Activity & Screenshots Loop
  useEffect(() => {
    if (!activeTimer) return;

    let isActiveLocally = true;
    let timeout: any;

    const resetIdleTimer = () => {
      isActiveLocally = true;
      if (isIdleLocally) setIsIdleLocally(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        isActiveLocally = false;
        setIsIdleLocally(true);
      }, 180000); // 3 minutes
    };

    // Attach listeners
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);

    // Initial trigger
    resetIdleTimer();

    const pingInterval = setInterval(async () => {
      const res = await reportActivityAction(isActiveLocally);
      if (res?.autoStopped) {
        toast.error('Task allocated hours completed. Timer stopped automatically.');
        stopTimerLocally();
      } else if (res?.timer) {
        setActiveTimer(res.timer);
      }
    }, 60000); // ping every minute

    // Screenshot every 3 minutes
    const screenshotInterval = setInterval(() => {
      if (isActiveLocally && streamRef.current) {
        takeScreenshot();
      }
    }, 180000);

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
      clearTimeout(timeout);
      clearInterval(pingInterval);
      clearInterval(screenshotInterval);
    };
  }, [activeTimer, isIdleLocally]);


  const startTimerLocally = async () => {
    if (!selectedTaskId) {
      toast.error('Please select an assigned task to start tracking.');
      return;
    }

    const task = assignedTasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    if (task.allocatedHours && task.trackedHours >= task.allocatedHours) {
      toast.error(`Allocated hours (${task.allocatedHours}h) completed. Cannot start tracking.`);
      return;
    }

    try {
      setLoading(true);

      // Try to get screen capture stream
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        toast.warning('Screenshots disabled. Proceeding without screen capture.');
      }

      const res = await startTimerAction(task.projectId, task.id);
      if (res.error) {
        toast.error(res.error);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      } else {
        toast.success('Timer started');
        // Inject relations manually for UI
        setActiveTimer({
          ...res.timer,
          task,
          project: task.project
        });
        setElapsedSeconds(0);
        setIsIdleLocally(false);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const stopTimerLocally = async () => {
    try {
      setLoading(true);
      const res = await stopTimerAction();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Timer stopped');
        setActiveTimer(null);
        // Refresh entries list
        const updatedEntries = [res.entry, ...timeEntries];
        setTimeEntries(updatedEntries);
      }

      // Stop screen capture
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const takeScreenshot = async () => {
    if (!videoRef.current || !streamRef.current || !activeTimer) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Img = canvas.toDataURL('image/jpeg', 0.5); // compress

      // Fire and forget upload API
      await fetch('/api/screenshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeTimerId: activeTimer.id,
          projectId: activeTimer.projectId,
          taskId: activeTimer.taskId,
          screenshotBase64: base64Img
        })
      });
    } catch (e) {
      console.error('Failed to capture screenshot', e);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <video ref={videoRef} muted className="hidden" />

      {/* Active Timer Section */}
      <Card className={`border-2 shadow-lg relative overflow-hidden transition-all duration-300 ${activeTimer ? (isIdleLocally ? 'border-amber-500 shadow-amber-500/10' : 'border-primary/50 shadow-primary/10') : 'border-border'}`}>
        {activeTimer && !isIdleLocally && (
          <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
        )}
        {activeTimer && isIdleLocally && (
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
        )}

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeTimer ? (
              isIdleLocally ? <><Pause className="text-amber-500" /> Idle Timer</> : <><Play className="text-primary animate-pulse" /> Active Timer</>
            ) : 'Start Tracking'}
          </CardTitle>
          <CardDescription>
            {activeTimer 
              ? (isIdleLocally ? 'You have been inactive for over 3 minutes. Idle time is excluded.' : 'Currently tracking time and capturing screenshots (if allowed).')
              : 'Select a task to begin tracking time.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTimer ? (
            <div className={`flex flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-xl border ${isIdleLocally ? 'bg-amber-50/50 border-amber-500/20' : 'bg-primary/5 border-primary/20'}`}>
              <div className="flex-1 space-y-1 text-center md:text-left">
                <p className="font-medium text-lg">{activeTimer.task?.title || 'Unknown Task'}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground justify-center md:justify-start">
                  <span>in {activeTimer.project?.name}</span>
                  {activeTimer.task?.allocatedHours && (
                    <Badge variant="outline" className="text-[10px]">
                      {Math.round((activeTimer.task.trackedHours + elapsedSeconds/3600) * 100) / 100} / {activeTimer.task.allocatedHours} hrs tracked
                    </Badge>
                  )}
                </div>
              </div>
              <div className={`text-5xl font-mono font-light tracking-tighter ${isIdleLocally ? 'text-amber-500' : 'text-primary'}`}>
                {formatTime(elapsedSeconds)}
              </div>
              <div className="flex gap-3">
                <Button onClick={stopTimerLocally} disabled={loading} variant="destructive" size="lg" className="rounded-full shadow-lg h-14 px-8">
                  {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Square className="mr-2 h-5 w-5" />} Stop Timer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium">Select Assigned Task</label>
                <select 
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choose a task...</option>
                  {assignedTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.project.name}) {t.allocatedHours ? `- ${Math.round((t.allocatedHours - t.trackedHours)*100)/100}h left` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={startTimerLocally} disabled={loading || !selectedTaskId} size="lg" className="w-full md:w-auto mt-4 md:mt-0 shadow-md">
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />} Start Timer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Time Entries History</h3>
            {userRole !== 'CLIENT' && (
              <Button variant="outline" onClick={() => setShowManualModal(true)}>
                <Plus className="mr-2" size={16} /> Add Manual Hours
              </Button>
            )}
        </div>
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Member</TableHead>
                <TableHead>Task / Project</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No time entries found.
                  </TableCell>
                </TableRow>
              ) : (
                timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">{entry.member?.name || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.task?.title || 'No Task'}</div>
                      <div className="text-xs text-muted-foreground">{entry.project?.name}</div>
                    </TableCell>
                    <TableCell>
                      {new Date(entry.startTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{entry.duration ? (Math.round(entry.duration * 100)/100) + ' hrs' : '-'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        Active: {Math.round((entry.activeWorkedDuration/3600)*100)/100}h
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{entry.entryType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {userRole !== 'CLIENT' && (
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary">
                          <ImageIcon size={14} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
      {/* Manual Entry Modal */}
      {showManualModal && (
        <ManualTimeModal 
          isOpen={showManualModal}
          onClose={() => {
             setShowManualModal(false);
             router.refresh(); // Refresh to pull the new manual entry
          }}
          userRole={userRole}
          userId={userId}
          organizationId={organizationId}
          allProjects={allProjects}
          allTasks={allTasks}
          allUsers={allUsers}
          assignedTasks={assignedTasks}
        />
      )}
    </>
  );
}
