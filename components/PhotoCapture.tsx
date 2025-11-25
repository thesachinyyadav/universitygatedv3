import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PhotoCaptureProps {
  onPhotoCapture: (photoDataUrl: string) => void;
  capturedPhoto?: string;
}

export default function PhotoCapture({ onPhotoCapture, capturedPhoto }: PhotoCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      // Check if running on HTTPS or localhost
      const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecureContext) {
        alert('⚠️ Camera requires HTTPS! Please use the deployed Vercel URL or localhost.');
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Camera API not available in this browser. Please use Chrome, Firefox, or Safari.');
        return;
      }

      console.log('🎥 Requesting camera access for photo...');
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log('✅ Camera access granted!');
      setStream(mediaStream);
      setIsCameraActive(true);
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Wait for video to start playing
          videoRef.current.onloadedmetadata = () => {
            console.log('📹 Video metadata loaded');
            videoRef.current?.play().then(() => {
              console.log('▶️ Video playing');
              setIsVideoReady(true);
            }).catch((err) => {
              console.error('Play error:', err);
              alert('⚠️ Failed to start video. Please try again.');
            });
          };
        }
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      
      let errorMessage = '';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = '🚫 Camera access denied!\n\nPlease click the camera icon in your browser address bar and allow camera access.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = '📷 No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = '⚠️ Camera is being used by another application.\n\nPlease close other apps using the camera and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = '⚙️ Camera constraints not supported. Trying without constraints...';
        // Retry without constraints
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(mediaStream);
          setIsCameraActive(true);
          
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().then(() => {
                  setIsVideoReady(true);
                });
              };
            }
          }, 100);
          return;
        } catch (retryError) {
          errorMessage = '❌ Camera initialization failed.';
        }
      } else if (error.name === 'SecurityError') {
        errorMessage = '🔒 Security error: Camera requires HTTPS!\n\nPlease use the deployed Vercel URL.';
      } else {
        errorMessage = `❌ Camera error: ${error.message || 'Unknown error'}\n\nPlease check browser settings.`;
      }
      
      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setIsVideoReady(false);
  };

  const capturePhoto = () => {
    console.log('📸 Attempting to capture photo...');
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      alert('❌ Camera not ready');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video dimensions are 0');
      alert('⚠️ Video not ready yet. Please wait a moment and try again.');
      return;
    }
    
    console.log(`📹 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
    
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Failed to get canvas context');
      alert('❌ Failed to get canvas context');
      return;
    }
    
    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      console.log('✅ Photo captured successfully, size:', photoDataUrl.length, 'bytes');
      
      // Pass photo to parent component
      onPhotoCapture(photoDataUrl);
      
      // Stop camera
      stopCamera();
      
      // Success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      alert('❌ Failed to capture photo. Please try again.');
    }
  };

  const retakePhoto = () => {
    onPhotoCapture('');
    startCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center space-x-3 mb-4">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-800">
          Capture Your Photo <span className="text-red-500">*</span>
        </h3>
      </div>

      {!capturedPhoto && !isCameraActive && (
        <div className="text-center py-8">
          <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-600 mb-6 px-4">
            We need to capture your photo for security verification
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span>Open Camera</span>
          </button>
        </div>
      )}

      {isCameraActive && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
            
            {/* Face Guide Overlay */}
            {isVideoReady && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Center circle guide */}
                <div className="relative">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full border-4 border-white border-dashed opacity-70 animate-pulse"></div>
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-3xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-3xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-3xl"></div>
                </div>
                
                {/* Instruction Text */}
                <div className="absolute top-4 left-0 right-0 text-center">
                  <div className="inline-block bg-black bg-opacity-70 px-4 py-2 rounded-lg">
                    <p className="text-white text-sm font-semibold">
                      📸 Center your face in the circle
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Loading camera...</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!isVideoReady}
              className={`flex-1 flex items-center justify-center space-x-2 ${
                isVideoReady 
                  ? 'btn-primary' 
                  : 'bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>{isVideoReady ? 'Capture Photo' : 'Please wait...'}</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn-secondary flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {capturedPhoto && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
            <img src={capturedPhoto} alt="Captured" className="w-full h-auto" />
            <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              ✓ Photo Captured
            </div>
          </div>
          <button
            type="button"
            onClick={retakePhoto}
            className="btn-secondary w-full flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Retake Photo</span>
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </motion.div>
  );
}
