import { useState, useEffect, useRef } from 'react';
import type { PresenceSession } from '../types/stats';

/**
 * Custom hook to calculate and track elapsed time for an active session
 * 
 * @param currentSession - The current active session (null if no session)
 * @returns Elapsed seconds since session start, or null if no active session
 * 
 * @example
 * const elapsedSeconds = useSessionTimer(currentSession);
 * // Returns: 125 (for 2 minutes 5 seconds elapsed)
 * // Returns: null (if no active session)
 */
export const useSessionTimer = (
  currentSession: PresenceSession | null
): number | null => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If no session or session has ended, return null
    if (!currentSession || currentSession.end !== null) {
      setElapsedSeconds(null);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - currentSession.start) / 1000);
      return elapsed;
    };

    // Set initial value
    setElapsedSeconds(calculateElapsed());

    // Update every second
    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    // Cleanup function
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentSession]);

  return elapsedSeconds;
};
