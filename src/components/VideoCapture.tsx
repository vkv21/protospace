import { useWebcam } from '../hooks/useWebcam';

export const VideoCapture = () => {
  const { videoRef, isCapturing, error, startCapture, stopCapture } =
    useWebcam();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Video Capture</h2>

      {/* Video Element */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto"
          style={{ maxHeight: '480px' }}
        />
        {!isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <p className="text-white text-lg">Camera Off</p>
          </div>
        )}
        {isCapturing && (
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Recording
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center">
        {!isCapturing ? (
          <button
            onClick={startCapture}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Start Capture
          </button>
        ) : (
          <button
            onClick={stopCapture}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Stop Capture
          </button>
        )}
      </div>

      {/* Presence Detection Placeholder */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-3">Presence Detection</h3>
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Status:</span>
            <span className="text-gray-400 italic">Not Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Desk Time Today:</span>
            <span className="text-gray-400 italic">--:--</span>
          </div>
        </div>
      </div>
    </div>
  );
};
