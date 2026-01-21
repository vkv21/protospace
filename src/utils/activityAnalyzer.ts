import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ActivityType } from '../types/stats';

// MediaPipe Pose Landmark indices (expanded set)
export const ACTIVITY_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export interface ActivityResult {
  activity: ActivityType;
  confidence: number; // 0-1 confidence in the classification
  details?: {
    posture?: 'upright' | 'leaning_forward' | 'leaning_back';
    handPosition?: 'near_head' | 'near_desk' | 'extended' | 'relaxed';
    armSymmetry?: 'symmetric' | 'asymmetric';
  };
}

// Thresholds for activity detection
const VISIBILITY_THRESHOLD = 0.5;
const WRIST_KEYBOARD_Y_MAX = 0.65; // Hands below this Y are likely at keyboard level
const WRIST_KEYBOARD_Y_MIN = 0.45; // Hands above this are too high
const HAND_NEAR_HEAD_DISTANCE = 0.12; // Distance threshold for phone call (stricter)
const ARM_EXTENDED_THRESHOLD = 0.6; // Distance threshold for extended arms
const FORWARD_LEAN_NOSE_Y = 0.35; // Nose higher (lower Y value) indicates forward lean
const BACK_LEAN_NOSE_Y = 0.55; // Nose lower (higher Y value) indicates back lean

/**
 * Calculate Euclidean distance between two landmarks in 2D space
 */
function distance2D(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a landmark is visible
 */
function isVisible(landmark: NormalizedLandmark | undefined): boolean {
  return (landmark?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
}

/**
 * Detect posture based on shoulder and nose positions
 */
function detectPosture(landmarks: NormalizedLandmark[]): 'upright' | 'leaning_forward' | 'leaning_back' {
  const nose = landmarks[ACTIVITY_LANDMARKS.NOSE];
  const leftShoulder = landmarks[ACTIVITY_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[ACTIVITY_LANDMARKS.RIGHT_SHOULDER];

  if (!nose || !isVisible(nose)) return 'upright';

  // Calculate average shoulder Y position
  let avgShoulderY = 0.5;
  if (isVisible(leftShoulder) && isVisible(rightShoulder)) {
    avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  } else if (isVisible(leftShoulder)) {
    avgShoulderY = leftShoulder.y;
  } else if (isVisible(rightShoulder)) {
    avgShoulderY = rightShoulder.y;
  }

  // Check nose position relative to shoulders
  const noseDiff = nose.y - avgShoulderY;

  if (nose.y < FORWARD_LEAN_NOSE_Y && noseDiff < -0.15) {
    return 'leaning_forward';
  } else if (nose.y > BACK_LEAN_NOSE_Y || noseDiff > 0.1) {
    return 'leaning_back';
  }

  return 'upright';
}

/**
 * Check if wrists are in typing position
 */
function isTypingPosition(landmarks: NormalizedLandmark[]): { isTyping: boolean; confidence: number } {
  const leftWrist = landmarks[ACTIVITY_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[ACTIVITY_LANDMARKS.RIGHT_WRIST];
  const leftElbow = landmarks[ACTIVITY_LANDMARKS.LEFT_ELBOW];
  const rightElbow = landmarks[ACTIVITY_LANDMARKS.RIGHT_ELBOW];
  const leftShoulder = landmarks[ACTIVITY_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[ACTIVITY_LANDMARKS.RIGHT_SHOULDER];

  let confidence = 0;
  let indicators = 0;

  // Check left hand
  if (isVisible(leftWrist) && isVisible(leftElbow)) {
    // Wrist at keyboard level
    if (leftWrist.y >= WRIST_KEYBOARD_Y_MIN && leftWrist.y <= WRIST_KEYBOARD_Y_MAX) {
      confidence += 0.3;
      indicators++;
    }

    // Elbow bent (typing position)
    if (isVisible(leftShoulder)) {
      const elbowBend = distance2D(leftWrist, leftShoulder);
      const armLength = distance2D(leftShoulder, leftElbow) + distance2D(leftElbow, leftWrist);
      if (elbowBend < armLength * 0.8) {
        confidence += 0.2;
        indicators++;
      }
    }
  }

  // Check right hand
  if (isVisible(rightWrist) && isVisible(rightElbow)) {
    // Wrist at keyboard level
    if (rightWrist.y >= WRIST_KEYBOARD_Y_MIN && rightWrist.y <= WRIST_KEYBOARD_Y_MAX) {
      confidence += 0.3;
      indicators++;
    }

    // Elbow bent (typing position)
    if (isVisible(rightShoulder)) {
      const elbowBend = distance2D(rightWrist, rightShoulder);
      const armLength = distance2D(rightShoulder, rightElbow) + distance2D(rightElbow, rightWrist);
      if (elbowBend < armLength * 0.8) {
        confidence += 0.2;
        indicators++;
      }
    }
  }

  return {
    isTyping: indicators >= 2 && confidence >= 0.5,
    confidence: Math.min(confidence, 1.0),
  };
}

/**
 * Check if one hand is in mouse position (extended, asymmetric)
 */
function isMousePosition(landmarks: NormalizedLandmark[]): { isMouse: boolean; confidence: number } {
  const leftWrist = landmarks[ACTIVITY_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[ACTIVITY_LANDMARKS.RIGHT_WRIST];

  if (!isVisible(leftWrist) || !isVisible(rightWrist)) {
    return { isMouse: false, confidence: 0 };
  }

  // Check for asymmetric hand positions
  const handYDiff = Math.abs(leftWrist.y - rightWrist.y);
  const handXDiff = Math.abs(leftWrist.x - rightWrist.x);

  // One hand extended more than the other
  let confidence = 0;

  if (handYDiff > 0.1 || handXDiff > 0.15) {
    confidence += 0.4;
  }

  // Check if one hand is at desk level (mouse level)
  const leftAtDesk = leftWrist.y >= WRIST_KEYBOARD_Y_MIN && leftWrist.y <= WRIST_KEYBOARD_Y_MAX;
  const rightAtDesk = rightWrist.y >= WRIST_KEYBOARD_Y_MIN && rightWrist.y <= WRIST_KEYBOARD_Y_MAX;

  if ((leftAtDesk && !rightAtDesk) || (rightAtDesk && !leftAtDesk)) {
    confidence += 0.4;
  }

  return {
    isMouse: confidence >= 0.6,
    confidence: Math.min(confidence, 1.0),
  };
}

/**
 * Check if hand is near head (phone call)
 */
function isPhoneCallPosition(landmarks: NormalizedLandmark[]): { isPhoneCall: boolean; confidence: number } {
  const nose = landmarks[ACTIVITY_LANDMARKS.NOSE];
  const leftWrist = landmarks[ACTIVITY_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[ACTIVITY_LANDMARKS.RIGHT_WRIST];
  const leftEar = landmarks[ACTIVITY_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[ACTIVITY_LANDMARKS.RIGHT_EAR];

  if (!nose || !isVisible(nose)) {
    return { isPhoneCall: false, confidence: 0 };
  }

  let confidence = 0;

  // Check left hand near head
  if (isVisible(leftWrist)) {
    const distToNose = distance2D(leftWrist, nose);
    const distToEar = isVisible(leftEar) ? distance2D(leftWrist, leftEar) : 1;

    if (distToNose < HAND_NEAR_HEAD_DISTANCE || distToEar < HAND_NEAR_HEAD_DISTANCE) {
      confidence = 0.8;
    }
  }

  // Check right hand near head
  if (isVisible(rightWrist) && confidence < 0.8) {
    const distToNose = distance2D(rightWrist, nose);
    const distToEar = isVisible(rightEar) ? distance2D(rightWrist, rightEar) : 1;

    if (distToNose < HAND_NEAR_HEAD_DISTANCE || distToEar < HAND_NEAR_HEAD_DISTANCE) {
      confidence = 0.8;
    }
  }

  return {
    isPhoneCall: confidence >= 0.7,
    confidence,
  };
}

/**
 * Check if arms are extended (stretching)
 */
function isStretchingPosition(landmarks: NormalizedLandmark[]): { isStretching: boolean; confidence: number } {
  const leftWrist = landmarks[ACTIVITY_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[ACTIVITY_LANDMARKS.RIGHT_WRIST];
  const leftShoulder = landmarks[ACTIVITY_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[ACTIVITY_LANDMARKS.RIGHT_SHOULDER];

  let confidence = 0;
  let extendedCount = 0;

  // Check if left arm is extended
  if (isVisible(leftWrist) && isVisible(leftShoulder)) {
    const armExtension = distance2D(leftWrist, leftShoulder);
    if (armExtension > ARM_EXTENDED_THRESHOLD) {
      confidence += 0.5;
      extendedCount++;
    }
  }

  // Check if right arm is extended
  if (isVisible(rightWrist) && isVisible(rightShoulder)) {
    const armExtension = distance2D(rightWrist, rightShoulder);
    if (armExtension > ARM_EXTENDED_THRESHOLD) {
      confidence += 0.5;
      extendedCount++;
    }
  }

  return {
    isStretching: extendedCount >= 1 && confidence >= 0.5,
    confidence: Math.min(confidence, 1.0),
  };
}

/**
 * Analyze pose landmarks to detect current activity
 * 
 * @param landmarks Array of pose landmarks from MediaPipe
 * @returns ActivityResult with detected activity and confidence
 */
export function detectActivity(landmarks: NormalizedLandmark[]): ActivityResult {
  if (!landmarks || landmarks.length === 0) {
    return {
      activity: 'away',
      confidence: 1.0,
    };
  }

  // Check for specific activities in order of priority
  const phoneCall = isPhoneCallPosition(landmarks);
  if (phoneCall.isPhoneCall) {
    return {
      activity: 'phone_call',
      confidence: phoneCall.confidence,
      details: {
        posture: detectPosture(landmarks),
        handPosition: 'near_head',
      },
    };
  }

  const stretching = isStretchingPosition(landmarks);
  if (stretching.isStretching) {
    return {
      activity: 'stretching',
      confidence: stretching.confidence,
      details: {
        posture: detectPosture(landmarks),
        handPosition: 'extended',
      },
    };
  }

  const typing = isTypingPosition(landmarks);
  const mouse = isMousePosition(landmarks);

  // Prefer typing over mouse if both detected
  if (typing.isTyping && typing.confidence > mouse.confidence) {
    return {
      activity: 'typing',
      confidence: typing.confidence,
      details: {
        posture: detectPosture(landmarks),
        handPosition: 'near_desk',
        armSymmetry: 'symmetric',
      },
    };
  }

  if (mouse.isMouse) {
    return {
      activity: 'mouse',
      confidence: mouse.confidence,
      details: {
        posture: detectPosture(landmarks),
        handPosition: 'near_desk',
        armSymmetry: 'asymmetric',
      },
    };
  }

  // Detect posture-based activities
  const posture = detectPosture(landmarks);

  if (posture === 'leaning_back') {
    return {
      activity: 'leaning_back',
      confidence: 0.7,
      details: {
        posture: 'leaning_back',
        handPosition: 'relaxed',
      },
    };
  }

  if (posture === 'leaning_forward') {
    return {
      activity: 'leaning_forward',
      confidence: 0.7,
      details: {
        posture: 'leaning_forward',
      },
    };
  }

  // Default to reading if upright with no specific hand activity
  return {
    activity: 'reading',
    confidence: 0.6,
    details: {
      posture: 'upright',
    },
  };
}

/**
 * Get human-readable label for activity
 */
export function getActivityLabel(activity: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    typing: 'Typing',
    mouse: 'Using Mouse',
    reading: 'Reading/Viewing',
    leaning_back: 'Leaning Back',
    leaning_forward: 'Leaning Forward',
    phone_call: 'Phone Call',
    stretching: 'Stretching',
    idle: 'Idle',
    away: 'Away',
  };

  return labels[activity] || 'Unknown';
}

/**
 * Get icon/emoji for activity visualization
 */
export function getActivityIcon(activity: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    typing: '⌨️',
    mouse: '🖱️',
    reading: '📖',
    leaning_back: '🪑',
    leaning_forward: '🧘',
    phone_call: '📞',
    stretching: '🤸',
    idle: '💺',
    away: '❌',
  };

  return icons[activity] || '❓';
}
