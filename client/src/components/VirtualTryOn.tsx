import { useEffect, useRef, useState } from "react";
import * as pose from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Upload, RotateCcw, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TryOnProps {
  garmentUrl: string;
  onSizeDetected?: (size: string, note: string) => void;
}

// EMA (Exponential Moving Average) for smoothing landmarks
class EMASmoother {
  private alpha: number;
  private value: { x: number; y: number; z: number } | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }

  smooth(next: { x: number; y: number; z: number }) {
    if (!this.value) {
      this.value = { ...next };
    } else {
      this.value.x = this.alpha * next.x + (1 - this.alpha) * this.value.x;
      this.value.y = this.alpha * next.y + (1 - this.alpha) * this.value.y;
      this.value.z = this.alpha * next.z + (1 - this.alpha) * this.value.z;
    }
    return this.value;
  }
}

export function VirtualTryOn({ garmentUrl, onSizeDetected }: TryOnProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const threeCanvasRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<"photo" | "live">("live");
  const { toast } = useToast();

  // State for detection
  const [currentSize, setCurrentSize] = useState<string>("M");
  const [currentNote, setCurrentNote] = useState<string>("");

  // Three.js State
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  // Segmented Garment Parts
  const torsoRef = useRef<THREE.Mesh | null>(null);
  const leftUpperSleeveRef = useRef<THREE.Mesh | null>(null);
  const rightUpperSleeveRef = useRef<THREE.Mesh | null>(null);

  // Smoothers for key points
  const smoothers = useRef<Record<number, EMASmoother>>({});

  useEffect(() => {
    if (!threeCanvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const updateSize = () => {
      if (!threeCanvasRef.current) return;
      const width = threeCanvasRef.current.clientWidth;
      const height = threeCanvasRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    threeCanvasRef.current.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(light);
    camera.position.z = 5;
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const loader = new THREE.TextureLoader();
    loader.load(garmentUrl, (texture) => {
      // Create Torso
      const torsoGeo = new THREE.PlaneGeometry(3, 4);
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
      const torso = new THREE.Mesh(torsoGeo, mat);
      scene.add(torso);
      torsoRef.current = torso;

      // Create Sleeves (Represented as planes for rotation logic)
      const sleeveGeo = new THREE.PlaneGeometry(1, 2);
      const leftSleeve = new THREE.Mesh(sleeveGeo, mat.clone());
      const rightSleeve = new THREE.Mesh(sleeveGeo, mat.clone());
      
      scene.add(leftSleeve);
      scene.add(rightSleeve);
      
      leftUpperSleeveRef.current = leftSleeve;
      rightUpperSleeveRef.current = rightSleeve;
    });

    return () => {
      renderer.dispose();
      window.removeEventListener("resize", updateSize);
      if (threeCanvasRef.current) {
        threeCanvasRef.current.removeChild(renderer.domElement);
      }
    };
  }, [garmentUrl]);

  useEffect(() => {
    if (mode !== "live") return;

    const poseInstance = new pose.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    poseInstance.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseInstance.onResults((results) => {
      setIsLoading(false);
      if (!results.poseLandmarks || !torsoRef.current) return;

      const landmarks = results.poseLandmarks;
      
      // Smoothing function
      const getSmooth = (idx: number) => {
        if (!smoothers.current[idx]) smoothers.current[idx] = new EMASmoother(0.2);
        return smoothers.current[idx].smooth(landmarks[idx]);
      };

      const ls = getSmooth(11); // Left Shoulder
      const rs = getSmooth(12); // Right Shoulder
      const le = getSmooth(13); // Left Elbow
      const re = getSmooth(14); // Right Elbow

      // Torso Alignment
      const centerX = (ls.x + rs.x) / 2;
      const centerY = (ls.y + rs.y) / 2;
      const shoulderWidth = Math.abs(ls.x - rs.x);

      torsoRef.current.position.set((centerX - 0.5) * 10, -(centerY - 0.5) * 8, 0);
      torsoRef.current.scale.set(shoulderWidth * 8, shoulderWidth * 8, 1);

      // Sleeve Rotation Logic
      if (leftUpperSleeveRef.current && rightUpperSleeveRef.current) {
        // Left Sleeve Rotation (Shoulder to Elbow)
        const leftAngle = Math.atan2(le.y - ls.y, le.x - ls.x);
        leftUpperSleeveRef.current.position.set((ls.x - 0.5) * 10, -(ls.y - 0.5) * 8, 0.1);
        leftUpperSleeveRef.current.rotation.z = leftAngle + Math.PI / 2;

        // Right Sleeve Rotation
        const rightAngle = Math.atan2(re.y - rs.y, re.x - rs.x);
        rightUpperSleeveRef.current.position.set((rs.x - 0.5) * 10, -(rs.y - 0.5) * 8, 0.1);
        rightUpperSleeveRef.current.rotation.z = rightAngle + Math.PI / 2;
      }

      // Advanced Size Detection
      if (onSizeDetected) {
        const torsoHeight = Math.abs(getSmooth(23).y - ls.y); // Hip to Shoulder
        const ratio = shoulderWidth / torsoHeight;
        
        let size = "M";
        let note = "Standard fit";
        
        if (shoulderWidth < 0.22) {
          size = "S";
          note = "Fitted look recommended";
        } else if (shoulderWidth > 0.32) {
          size = "XL";
          note = "Relaxed fit for comfort";
        } else if (shoulderWidth > 0.28) {
          size = "L";
          note = "True to size";
        }

        setCurrentSize(size);
        setCurrentNote(note);
        onSizeDetected(size, note);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            await poseInstance.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }
  }, [mode, onSizeDetected]);

  const handleSaveSession = async () => {
    if (!videoRef.current || isSaving) return;
    
    setIsSaving(true);
    try {
      // Capture frame
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg");
        
        await apiRequest("POST", "/api/try-on/session", {
          userPhotoBase64: base64,
          detectedSize: currentSize,
          confidenceScore: "0.95",
        });

        toast({
          title: "Session Saved",
          description: "Your try-on photo has been uploaded to Cloudinary.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save session.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="relative overflow-hidden w-full h-full bg-black flex items-center justify-center rounded-3xl border-none">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-50">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Initializing AR Engine...</p>
        </div>
      )}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline />
      <div ref={threeCanvasRef} className="absolute inset-0 z-10 pointer-events-none" />
      <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2 z-20">
        <div className="flex gap-2">
          <Button variant={mode === "live" ? "default" : "secondary"} size="sm" onClick={() => setMode("live")}>
            <Camera className="w-4 h-4 mr-2" /> Live
          </Button>
          <Button variant={mode === "photo" ? "default" : "secondary"} size="sm" onClick={() => setMode("photo")}>
            <Upload className="w-4 h-4 mr-2" /> Photo
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveSession}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Save to Cloudinary
          </Button>
          <Button variant="outline" size="icon"><RotateCcw className="w-4 h-4" /></Button>
        </div>
      </div>
    </Card>
  );
}
