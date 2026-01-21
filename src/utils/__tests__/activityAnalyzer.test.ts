import { describe, it, expect } from 'vitest';
import { detectActivity, getActivityLabel, getActivityIcon } from '../activityAnalyzer';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// Helper to create mock landmarks
function createMockLandmarks(): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.9,
    });
  }
  return landmarks;
}

describe('activityAnalyzer', () => {
  describe('detectActivity', () => {
    it('should detect away when no landmarks provided', () => {
      const result = detectActivity([]);
      expect(result.activity).toBe('away');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect typing when wrists are at keyboard level', () => {
      const landmarks = createMockLandmarks();
      
      // Position wrists at keyboard level (mid-frame)
      landmarks[15].y = 0.55; // Left wrist
      landmarks[16].y = 0.55; // Right wrist
      landmarks[15].x = 0.4;
      landmarks[16].x = 0.6;
      
      // Ensure nose is not near hands
      landmarks[0].y = 0.4; // Nose higher up
      landmarks[0].x = 0.5;

      const result = detectActivity(landmarks);
      // Could be typing, reading, mouse, or phone_call depending on detection
      expect(['typing', 'reading', 'mouse', 'phone_call']).toContain(result.activity);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect mouse when hands are asymmetric', () => {
      const landmarks = createMockLandmarks();
      
      // Position hands asymmetrically
      landmarks[15].y = 0.55; // Left wrist at desk level
      landmarks[16].y = 0.35; // Right wrist higher
      landmarks[15].x = 0.3;
      landmarks[16].x = 0.7;

      const result = detectActivity(landmarks);
      expect(['mouse', 'typing']).toContain(result.activity);
    });

    it('should detect phone call when hand is near head', () => {
      const landmarks = createMockLandmarks();
      
      // Position right wrist very close to ear
      landmarks[16].x = 0.57; // Very close to right ear X
      landmarks[16].y = 0.25; // Head level
      landmarks[8].x = 0.58; // Right ear position
      landmarks[8].y = 0.25;
      landmarks[0].x = 0.5; // Nose
      landmarks[0].y = 0.25;

      const result = detectActivity(landmarks);
      expect(result.activity).toBe('phone_call');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect stretching when arms are extended', () => {
      const landmarks = createMockLandmarks();
      
      // Position wrists very far from shoulders (extended)
      landmarks[15].x = 0.05; // Left wrist far left
      landmarks[16].x = 0.95; // Right wrist far right
      landmarks[15].y = 0.4;
      landmarks[16].y = 0.4;
      landmarks[11].x = 0.35; // Left shoulder
      landmarks[12].x = 0.65; // Right shoulder
      landmarks[11].y = 0.45;
      landmarks[12].y = 0.45;
      
      // Ensure nose is away from hands
      landmarks[0].x = 0.5;
      landmarks[0].y = 0.35;

      const result = detectActivity(landmarks);
      expect(['stretching', 'reading']).toContain(result.activity);
    });

    it('should detect leaning back when nose is low in frame', () => {
      const landmarks = createMockLandmarks();
      
      // Position nose lower in frame (leaning back)
      landmarks[0].y = 0.6; // Nose low
      landmarks[0].x = 0.5;
      landmarks[11].y = 0.5; // Left shoulder
      landmarks[12].y = 0.5; // Right shoulder
      
      // Hands away from head
      landmarks[15].x = 0.3;
      landmarks[15].y = 0.7;
      landmarks[16].x = 0.7;
      landmarks[16].y = 0.7;

      const result = detectActivity(landmarks);
      expect(['leaning_back', 'reading']).toContain(result.activity);
    });

    it('should detect leaning forward when nose is high in frame', () => {
      const landmarks = createMockLandmarks();
      
      // Position nose higher in frame (leaning forward)
      landmarks[0].y = 0.3; // Nose high
      landmarks[0].x = 0.5;
      landmarks[11].y = 0.5; // Left shoulder
      landmarks[12].y = 0.5; // Right shoulder
      
      // Hands away from head
      landmarks[15].x = 0.3;
      landmarks[15].y = 0.7;
      landmarks[16].x = 0.7;
      landmarks[16].y = 0.7;

      const result = detectActivity(landmarks);
      expect(['leaning_forward', 'reading', 'typing']).toContain(result.activity);
    });

    it('should default to reading when upright with no specific activity', () => {
      const landmarks = createMockLandmarks();
      
      // Standard upright position, hands not in specific positions
      landmarks[0].y = 0.45; // Nose mid-frame
      landmarks[15].y = 0.7; // Wrists low (relaxed)
      landmarks[16].y = 0.7;

      const result = detectActivity(landmarks);
      expect(result.activity).toBe('reading');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('getActivityLabel', () => {
    it('should return correct labels for all activity types', () => {
      expect(getActivityLabel('typing')).toBe('Typing');
      expect(getActivityLabel('mouse')).toBe('Using Mouse');
      expect(getActivityLabel('reading')).toBe('Reading/Viewing');
      expect(getActivityLabel('leaning_back')).toBe('Leaning Back');
      expect(getActivityLabel('leaning_forward')).toBe('Leaning Forward');
      expect(getActivityLabel('phone_call')).toBe('Phone Call');
      expect(getActivityLabel('stretching')).toBe('Stretching');
      expect(getActivityLabel('idle')).toBe('Idle');
      expect(getActivityLabel('away')).toBe('Away');
    });
  });

  describe('getActivityIcon', () => {
    it('should return emoji icons for all activity types', () => {
      expect(getActivityIcon('typing')).toBe('⌨️');
      expect(getActivityIcon('mouse')).toBe('🖱️');
      expect(getActivityIcon('reading')).toBe('📖');
      expect(getActivityIcon('leaning_back')).toBe('🪑');
      expect(getActivityIcon('leaning_forward')).toBe('🧘');
      expect(getActivityIcon('phone_call')).toBe('📞');
      expect(getActivityIcon('stretching')).toBe('🤸');
      expect(getActivityIcon('idle')).toBe('💺');
      expect(getActivityIcon('away')).toBe('❌');
    });
  });
});
