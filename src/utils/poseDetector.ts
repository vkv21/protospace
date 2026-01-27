import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Define our own interface based on MediaPipe's actual return structure
export interface PoseDetectionResult {
  landmarks: Array<
    Array<{ x: number; y: number; z: number; visibility?: number }>
  >;
  worldLandmarks: Array<
    Array<{ x: number; y: number; z: number; visibility?: number }>
  >;
}

class PoseDetectorSingleton {
  private static instance: PoseDetectorSingleton | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  // Singleton instance accessor
  public static getInstance(): PoseDetectorSingleton {
    if (!PoseDetectorSingleton.instance) {
      PoseDetectorSingleton.instance = new PoseDetectorSingleton();
    }
    return PoseDetectorSingleton.instance;
  }

  // Initialize the PoseLandmarker if not already done
  public async initialize(): Promise<void> {
    if (this.poseLandmarker) {
      return; // Already initialized
    }

    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise; // Return existing promise
    }

    this.isInitializing = true;
    this.initializationPromise = this.doInitialize();

    try {
      await this.initializationPromise;
      // after initialization, the promise returns void and the landmarker is set in doInitialize
    } finally {
      this.isInitializing = false;
      // initializationPromise when resolved, will have set the landmarker
      this.initializationPromise = null;
    }
  }

  // Actual initialization logic -- landmarker is set and can be used with detect()
  private async doInitialize(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm',
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1, // Only detect one person for desk presence
      });
    } catch (error) {
      console.error('Failed to initialize PoseLandmarker:', error);
      throw new Error(
        `PoseLandmarker initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  public detect(
    videoElement: HTMLVideoElement,
    timestamp: number,
  ): PoseDetectionResult | null {
    if (!this.poseLandmarker) {
      console.warn('PoseLandmarker not initialized');
      return null;
    }

    // Check if video is ready
    if (
      videoElement.readyState < 2 ||
      videoElement.videoWidth === 0 ||
      videoElement.videoHeight === 0
    ) {
      return null;
    }

    try {
      const results = this.poseLandmarker.detectForVideo(
        videoElement,
        timestamp,
      );

      if (!results.landmarks || results.landmarks.length === 0) {
        return null;
      }

      // Filter out low-quality detections
      // Check visibility of key landmarks to ensure meaningful detection
      const firstPersonLandmarks = results.landmarks[0];
      if (firstPersonLandmarks && firstPersonLandmarks.length > 12) {
        const nose = firstPersonLandmarks[0];
        const leftShoulder = firstPersonLandmarks[11];
        const rightShoulder = firstPersonLandmarks[12];

        // Require at least one shoulder with good visibility
        const leftShoulderVisible = (leftShoulder?.visibility ?? 0) >= 0.6;
        const rightShoulderVisible = (rightShoulder?.visibility ?? 0) >= 0.6;
        const noseVisible = (nose?.visibility ?? 0) >= 0.5;

        // Reject detection if no key landmarks are visible enough
        if (!leftShoulderVisible && !rightShoulderVisible && !noseVisible) {
          return null;
        }
      }

      return {
        landmarks: results.landmarks,
        worldLandmarks: results.worldLandmarks,
      };
    } catch (error) {
      console.error('Detection error:', error);
      return null;
    }
  }

  public close(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
  }

  public isReady(): boolean {
    return this.poseLandmarker !== null;
  }
}

// Export singleton instance getter
export const getPoseDetector = () => PoseDetectorSingleton.getInstance();
