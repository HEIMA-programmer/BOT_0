import { useEffect, useRef } from 'react';
import { progressAPI } from '../api';

const apiBaseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '/api');

export default function useLearningTimeTracker(module, activityType) {
  // eslint-disable-next-line react-hooks/purity -- Date.now() initializer is intentional for time tracking
  const startedAtRef = useRef(Date.now());
  const accumulatedMsRef = useRef(0);

  useEffect(() => {
    if (!module || !activityType) {
      return undefined;
    }

    const flushTrackedTime = (useBeacon = false) => {
      const now = Date.now();
      accumulatedMsRef.current += Math.max(0, now - startedAtRef.current);
      startedAtRef.current = now;

      const minutes = useBeacon
        ? Math.ceil(accumulatedMsRef.current / 60000)
        : Math.floor(accumulatedMsRef.current / 60000);

      if (minutes <= 0) {
        return;
      }

      accumulatedMsRef.current -= minutes * 60000;
      const payload = {
        module,
        activity_type: activityType,
        time_spent: minutes,
      };

      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(`${apiBaseURL}/progress/track-time`, blob);
        return;
      }

      const request = progressAPI.trackTime(payload);
      if (request && typeof request.catch === 'function') {
        request.catch((error) => {
          console.error('Failed to track learning time:', error);
        });
      }
    };

    const intervalId = window.setInterval(() => flushTrackedTime(false), 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushTrackedTime(true);
      } else {
        startedAtRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      flushTrackedTime(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      flushTrackedTime(true);
    };
  }, [activityType, module]);
}
