import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Pose, Results } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Camera as CameraIcon, X, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TSHIRT_VIEWS = {
  front: "/tshirt-front.png",
  back: "/tshirt-back.png",
  left: "/tshirt-left.png",
  right: "/tshirt-right.png",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(true); // Default to active for seamless entry
  const [shirtImages, setShirtImages] = useState<Record<string, HTMLImageElement>>({});
  const [view, setView] = useState<keyof typeof TSHIRT_VIEWS>("front");
  const [shirtColor] = useState<string>("#FFFFFF");
  const [isSaving, setIsSaving] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [sizeData, setSizeData] = useState<{ size: string; confidence: number; label: string } | null>(null);
  const lastViewRef = useRef<keyof typeof TSHIRT_VIEWS>("front");
  const viewBufferRef = useRef<{view: keyof typeof TSHIRT_VIEWS, count: number}>({view: "front", count: 0});
  const { toast } = useToast();

  const calculateSize = useCallback((landmarks: any[], videoWidth: number, videoHeight: number) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const shoulderWidthPx = Math.sqrt(
      Math.pow((leftShoulder.x - rightShoulder.x) * videoWidth, 2) +
      Math.pow((leftShoulder.y - rightShoulder.y) * videoHeight, 2)
    );

    // 1. Calculate base size from normalized shoulder width
    const normShoulderWidth = shoulderWidthPx / videoWidth;
    
    // Adjusted thresholds: 
    // < 0.20: S
    // 0.20 - 0.30: M
    // 0.30 - 0.40: L
    // > 0.40: XL
    let size = "M";
    let targetWidth = 0.25; // center of M range
    
    if (normShoulderWidth < 0.20) {
      size = "S";
      targetWidth = 0.15;
    } else if (normShoulderWidth < 0.30) {
      size = "M";
      targetWidth = 0.25;
    } else if (normShoulderWidth < 0.40) {
      size = "L";
      targetWidth = 0.35;
    } else {
      size = "XL";
      targetWidth = 0.45;
    }

    // 2. Calculate confidence based on proximity to the camera
    // Optimal detection happens when shoulders occupy a healthy 15-40% of the screen
    // If the person is too close (XL/Large) or too far (Small), confidence naturally drops
    const distanceScore = Math.max(0, 1 - Math.abs(normShoulderWidth - 0.25) * 2);
    let confidence = 70 + (distanceScore * 25);

    // Only suggest size if we have good tracking of key landmarks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const hasLowerBody = (leftHip.visibility || 0) > 0.5 && (rightHip.visibility || 0) > 0.5;
    
    // If we can't see enough of the body, we shouldn't be confident in the size
    if (!hasLowerBody) {
      return null;
    }

    return {
      size,
      confidence: Math.round(Math.min(99, confidence)),
      label: size === "M" ? "Perfect Fit" : "Suggested"
    };
  }, []);

  // Load all t-shirt views
  useEffect(() => {
    const loadImages = async () => {
      const loaded: Record<string, HTMLImageElement> = {};
      const promises = Object.entries(TSHIRT_VIEWS).map(([key, src]) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.crossOrigin = "anonymous";
          img.onload = () => {
            loaded[key] = img;
            resolve();
          };
        });
      });
      await Promise.all(promises);
      setShirtImages(loaded);
    };
    loadImages();
  }, []);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !webcamRef.current?.video || Object.keys(shirtImages).length === 0) return;

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    const canvas = canvasRef.current;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Mirror the canvas to match the mirrored webcam
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // Draw the camera feed
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const nose = landmarks[0];
      const leftEye = landmarks[2];
      const rightEye = landmarks[5];

      const isTracking = (leftShoulder.visibility || 0) > 0.5 && (rightShoulder.visibility || 0) > 0.5;
      setPoseDetected(isTracking);

      if (isTracking) {
        const data = calculateSize(landmarks, videoWidth, videoHeight);
        setSizeData(data);
        const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
        
        const faceVisibilityThreshold = 0.2;
        const isFaceVisible = (nose.visibility || 0) > faceVisibilityThreshold || 
                             (leftEye.visibility || 0) > faceVisibilityThreshold || 
                             (rightEye.visibility || 0) > faceVisibilityThreshold;
        
        const avgShoulderZ = (leftShoulder.z + rightShoulder.z) / 2;
        const isHeadBehindShoulders = (nose.z > avgShoulderZ + 0.05);
        const isFacingAway = !isFaceVisible || isHeadBehindShoulders;
        
        const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * videoWidth;
        let centerY = 0;

        const sideViewThreshold = 0.08; 
        const isSideView = shoulderDistance < sideViewThreshold && !isFacingAway && (Math.abs(leftShoulder.z - rightShoulder.z) > 0.1);
        
        let detectedView: keyof typeof TSHIRT_VIEWS = "front";
        if (isSideView) {
          detectedView = leftShoulder.z < rightShoulder.z ? "right" : "left"; 
        } else if (isFacingAway) {
          detectedView = "back";
          const faceVisibilityThreshold = 0.15;
          const isFaceVisibleStrict = (nose.visibility || 0) > faceVisibilityThreshold || 
                                     (leftEye.visibility || 0) > faceVisibilityThreshold || 
                                     (rightEye.visibility || 0) > faceVisibilityThreshold;
          
          if (isFaceVisibleStrict && !isHeadBehindShoulders) {
            detectedView = "front";
          }
        } else {
          detectedView = "front";
        }

        // Stability Smoothing: Only switch views if the new view is consistent for 3 frames
        if (detectedView === viewBufferRef.current.view) {
          viewBufferRef.current.count++;
        } else {
          viewBufferRef.current.view = detectedView;
          viewBufferRef.current.count = 1;
        }

        const stableView = viewBufferRef.current.count >= 3 ? detectedView : lastViewRef.current;
        lastViewRef.current = stableView;
        setView(stableView);

        const shirtImage = shirtImages[stableView];
        if (shirtImage) {
          const bodyHeightPx = Math.abs(leftHip.y - leftShoulder.y) * videoHeight;
          const stableSideWidthPx = bodyHeightPx * 0.8;
          const shoulderWidthPx = (stableView === "left" || stableView === "right") ? stableSideWidthPx : Math.abs(leftShoulder.x - rightShoulder.x) * videoWidth;
          const drawWidth = shoulderWidthPx * ((stableView === "left" || stableView === "right") ? 1.6 : 2.2);
          const drawHeight = drawWidth * (shirtImage.height / shirtImage.width);

          if (stableView === "right" || stableView === "left") {
            centerY = ((leftShoulder.y + rightShoulder.y) / 2) * videoHeight + (drawHeight * 0.25);
          } else {
            centerY = ((leftShoulder.y + rightShoulder.y) / 2) * videoHeight + (drawHeight * 0.28);
          }

          ctx.translate(centerX, centerY);
          if (shirtColor !== "#FFFFFF") {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = shirtImage.width;
            tempCanvas.height = shirtImage.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(shirtImage, 0, 0);
              tempCtx.globalCompositeOperation = 'source-in';
              tempCtx.fillStyle = shirtColor;
              tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              ctx.drawImage(shirtImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
              ctx.globalAlpha = 0.6;
              ctx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
              ctx.globalAlpha = 1.0;
            }
          } else {
            ctx.drawImage(shirtImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          }
          ctx.translate(-centerX, -centerY);
        }
      }
    }
    ctx.restore();
  }, [shirtImages, shirtColor, calculateSize]);

  const poseRef = useRef<Pose | null>(null);

  useEffect(() => {
    if (!poseRef.current) {
      poseRef.current = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      poseRef.current.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }
    poseRef.current.onResults(onResults);
  }, [onResults]);

  useEffect(() => {
    let camera: Camera | null = null;
    if (isCameraActive && webcamRef.current?.video && poseRef.current) {
      const pose = poseRef.current;
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video) {
            await pose.send({ image: webcamRef.current.video });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }
    return () => { 
      if (camera) camera.stop();
    };
  }, [isCameraActive, onResults]);

  const takeSnapshot = async () => {
    if (!canvasRef.current) return;
    try {
      setIsSaving(true);
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `try-on-\${new Date().getTime()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Snapshot downloaded!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to download snapshot.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white text-black overflow-hidden z-50">
      <main className="h-full w-full relative">
        {!isCameraActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <CameraIcon className="w-16 h-16 text-black/20 animate-pulse" />
            <h3 className="text-2xl font-bold">AR experience paused</h3>
            <Button size="lg" onClick={() => setIsCameraActive(true)} className="rounded-full bg-black text-white hover:bg-black/90">Resume Experience</Button>
          </div>
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              mirrored
              className="absolute inset-0 w-full h-full object-cover"
              videoConstraints={ { facingMode: "user" } }
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />

            {/* Fullscreen UI Overlays */}
            <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
              {/* Top Row: Navigation and Status */}
              <div className="flex items-center justify-between pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/")}
                  className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-md hover:bg-white/60 border border-black/10 text-black"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                
                <div className="px-4 py-2 rounded-full bg-white/40 backdrop-blur-md border border-black/10 flex items-center gap-2 text-black">
                  <div className={`w-2 h-2 rounded-full \${poseDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{poseDetected ? 'Tracking active' : 'Detecting...'}</span>
                </div>

                {sizeData && poseDetected && (view === 'front' || view === 'back') && (
                  <div className="flex flex-col items-end gap-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="px-4 py-2 rounded-2xl bg-white/60 backdrop-blur-xl border border-black/10 shadow-xl flex items-center gap-4 text-black">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-black/40 leading-none">Suggested Size</span>
                        <span className="text-2xl font-black leading-none">{sizeData.size}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-black/5" />
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-black/40 leading-none">Fit Confidence</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold tabular-nums leading-none">{sizeData.confidence}%</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      {sizeData.label}
                    </div>
                  </div>
                )}
              </div>

              {/* Side Actions */}
              <div className="flex flex-col items-end gap-3 pointer-events-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={takeSnapshot}
                  className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-md hover:bg-white/60 border border-black/10 text-black"
                >
                  <CameraIcon className="w-6 h-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCameraActive(false)}
                  className="w-14 h-14 rounded-full bg-red-500/10 backdrop-blur-md hover:bg-red-500/20 border border-red-500/30 text-red-500"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              {/* Bottom View Feedback */}
              <div className="flex flex-col items-center gap-4">
                <div className="px-6 py-3 rounded-2xl bg-white/40 backdrop-blur-md border border-black/10 flex flex-col items-center gap-2 pointer-events-auto">
                   <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase \${view === 'front' ? 'bg-black text-white' : 'bg-black/5 text-black/50'}`}>Front</div>
                      <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase \${view === 'back' ? 'bg-black text-white' : 'bg-black/5 text-black/50'}`}>Back</div>
                      <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase \${view === 'left' || view === 'right' ? 'bg-black text-white' : 'bg-black/5 text-black/50'}`}>Side</div>
                   </div>
                   <p className="text-xs text-black/60 text-center">
                     {poseDetected ? "Tracking active. Turn around to see different views." : "Step back until your upper body is visible."}
                   </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
