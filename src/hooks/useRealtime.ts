import { useEffect, useState } from 'react';

export function useRealtime(channels: { projectId?: string; taskId?: string }[]) {
  const [lastEvent, setLastEvent] = useState<{ event: string, payload: any } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    channels.forEach(ch => {
      if (ch.projectId) params.append('projectId', ch.projectId);
      if (ch.taskId) params.append('taskId', ch.taskId);
    });

    const url = `/api/realtime?${params.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'connected') return;
        setLastEvent(data);
      } catch (err) {
        console.error('SSE parsing error', err);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE Error', e);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [JSON.stringify(channels)]);

  return { lastEvent };
}
