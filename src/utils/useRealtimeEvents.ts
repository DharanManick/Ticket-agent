import { useEffect, useRef } from 'react';

export interface RealtimeSyncEvent {
  timestamp: string;
  status: string;
  count: number;
  lastSyncInfo?: any;
}

export function useRealtimeEvents(onSync?: (data: RealtimeSyncEvent) => void) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      try {
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('connected', () => {
          // Connected to live server push stream
        });

        eventSource.addEventListener('servicenow_sync', (event: MessageEvent) => {
          try {
            const data: RealtimeSyncEvent = JSON.parse(event.data);
            if (onSyncRef.current) {
              onSyncRef.current(data);
            }
            window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', { detail: data }));
          } catch (e) {
            console.warn('Failed to parse realtime sync event', e);
          }
        });

        eventSource.addEventListener('servicenow_realtime_sync', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('servicenow_realtime_sync', { detail: data }));
          } catch (e) {}
        });

        eventSource.addEventListener('governance_mandatory_metrics_updated', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('governance_mandatory_metrics_updated', { detail: data }));
          } catch (e) {}
        });

        eventSource.addEventListener('background_log', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('servicenow_realtime_log', { detail: data }));
          } catch (e) {}
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (isMounted && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connect();
            }, 3000);
          }
        };
      } catch (err) {
        if (isMounted && !reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            connect();
          }, 5000);
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, []);
}
