import { useEffect, useState, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { analyzePoseLandmarks } from '../utils/presenceAnalyzer';
import { detectActivity } from '../utils/activityAnalyzer';
import type { PresenceResult } from '../utils/presenceAnalyzer';
import type { ActivityType } from '../types/stats';

export interface PresenceState {
  isPresent: boolean; // Whether user is currently at their desk
  confidence: number; // Confidence score of the presence detection
  lastSeen: Date | null;
  deskTime: number; // Total seconds at desk today
  currentActivity: ActivityType | null; // Current detected activity
  activityConfidence: number; // Confidence in activity detection
}

export interface UsePresenceTrackingOptions {
  hysteresisFrames?: number; // Number of consecutive frames needed to change state (default: 2)
}

const STORAGE_KEY = 'aideskwatch_presence';
const STORAGE_DATE_KEY = 'aideskwatch_last_date';

interface StoredPresenceData {
  deskTime: number;
  date: string;
}

/**
 * Loads desk time from localStorage, resetting if it's a new day
 */
function loadDeskTime(): number {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const storedDate = localStorage.getItem(STORAGE_DATE_KEY);
    const today = new Date().toDateString();

    if (storedDate !== today) {
      // New day, reset
      return 0;
    }

    if (storedData) {
      const data: StoredPresenceData = JSON.parse(storedData);
      return data.deskTime || 0;
    }
  } catch (error) {
    console.error('Failed to load desk time from localStorage:', error);
  }
  return 0;
}

/**
 * Saves desk time to localStorage with current date
 */
function saveDeskTime(deskTime: number): void {
  try {
    const today = new Date().toDateString();
    const data: StoredPresenceData = {
      deskTime,
      date: today,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_DATE_KEY, today);
  } catch (error) {
    console.error('Failed to save desk time to localStorage:', error);
  }
}

export const usePresenceTracking = (
  landmarks: NormalizedLandmark[] | null,
  options: UsePresenceTrackingOptions = {}
): PresenceState => {
  const { hysteresisFrames = 2 } = options;

  const [deskTime, setDeskTime] = useState(() => loadDeskTime());
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isPresent, setIsPresent] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [currentActivity, setCurrentActivity] = useState<ActivityType | null>(null);
  const [activityConfidence, setActivityConfidence] = useState(0);

  const consecutivePresenceRef = useRef(0);
  const consecutiveAbsenceRef = useRef(0);
  const lastPresenceCheckRef = useRef<Date | null>(null);
  const lastValidPresenceTimeRef = useRef<number>(0);

  // Analyze landmarks and update presence state
  useEffect(() => {
    if (!landmarks || landmarks.length === 0) {
      consecutiveAbsenceRef.current += 1;
      consecutivePresenceRef.current = 0;

      // Change to absent after hysteresisFrames consecutive absences
      if (consecutiveAbsenceRef.current >= hysteresisFrames) {
        queueMicrotask(() => {
          setIsPresent(false);
          setConfidence(0);
          setCurrentActivity('away');
          setActivityConfidence(1.0);
        });
      }
      return;
    }

    const result: PresenceResult = analyzePoseLandmarks(landmarks);

    // Detect activity when present
    let activityResult = null;
    if (result.isPresent) {
      activityResult = detectActivity(landmarks);
      console.log('🎯 Activity detected:', activityResult);
    }

    if (result.isPresent) {
      consecutivePresenceRef.current += 1;
      consecutiveAbsenceRef.current = 0;

      // Initialize timer on first valid presence if not set
      if (lastValidPresenceTimeRef.current === 0) {
        lastValidPresenceTimeRef.current = Date.now();
      } else {
        lastValidPresenceTimeRef.current = Date.now();
      }

      // Update last seen, confidence, and activity
      queueMicrotask(() => {
        setLastSeen(new Date());
        setConfidence(result.confidence);
        if (activityResult) {
          setCurrentActivity(activityResult.activity);
          setActivityConfidence(activityResult.confidence);
        }
      });

      // Change to present after hysteresisFrames consecutive detections
      if (consecutivePresenceRef.current >= hysteresisFrames) {
        queueMicrotask(() => {
          setIsPresent(true);
        });
      }
    } else {
      consecutiveAbsenceRef.current += 1;
      consecutivePresenceRef.current = 0;

      queueMicrotask(() => {
        setConfidence(result.confidence);
      });

      // Change to absent after hysteresisFrames consecutive absences
      if (consecutiveAbsenceRef.current >= hysteresisFrames) {
        queueMicrotask(() => {
          setIsPresent(false);
          setCurrentActivity('away');
          setActivityConfidence(1.0);
        });
      }
    }
  }, [landmarks, hysteresisFrames]);

  // Timeout-based fallback: Force away status after 5 seconds of no valid presence
  useEffect(() => {
    if (!isPresent) {
      return;
    }

    const checkTimeout = setInterval(() => {
      const timeSinceLastValidPresence =
        Date.now() - lastValidPresenceTimeRef.current;
      const PRESENCE_TIMEOUT_MS = 5000; // 5 seconds

      if (timeSinceLastValidPresence > PRESENCE_TIMEOUT_MS) {
        setIsPresent(false);
        setConfidence(0);
        consecutivePresenceRef.current = 0;
        consecutiveAbsenceRef.current = hysteresisFrames;
      }
    }, 1000);

    return () => {
      clearInterval(checkTimeout);
    };
  }, [isPresent, hysteresisFrames]);

  // Track desk time when present
  useEffect(() => {
    if (!isPresent) {
      lastPresenceCheckRef.current = null;
      return;
    }

    // Initialize timestamp on first detection
    if (!lastPresenceCheckRef.current) {
      lastPresenceCheckRef.current = new Date();
    }

    // Update desk time every second
    const interval = setInterval(() => {
      const now = new Date();
      const lastCheck = lastPresenceCheckRef.current;

      if (lastCheck) {
        const elapsedSeconds = Math.floor(
          (now.getTime() - lastCheck.getTime()) / 1000
        );

        if (elapsedSeconds >= 1) {
          setDeskTime((prev) => {
            const newDeskTime = prev + elapsedSeconds;
            saveDeskTime(newDeskTime);
            return newDeskTime;
          });
          lastPresenceCheckRef.current = now;
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isPresent]);

  // Check for date change and reset desk time
  useEffect(() => {
    const checkDateChange = () => {
      const storedDate = localStorage.getItem(STORAGE_DATE_KEY);
      const today = new Date().toDateString();

      if (storedDate && storedDate !== today) {
        setDeskTime(0);
        saveDeskTime(0);
      }
    };

    // Check every minute
    const interval = setInterval(checkDateChange, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    isPresent,
    confidence,
    lastSeen,
    deskTime,
    currentActivity,
    activityConfidence,
  };
};
