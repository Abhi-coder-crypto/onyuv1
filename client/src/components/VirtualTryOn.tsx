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

  constructor(alpha: number = 0.15) { // Lower alpha for more smoothing
    this.alpha = alpha;
  }

  smooth(next: { x: number; y: number; z: number }) {
    if (!this.value) {
      this.value = { ...next };
    } else {
      // Basic EMA smoothing
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
  const leftLowerSleeveRef = useRef<THREE.Mesh | null>(null);
  const rightUpperSleeveRef = useRef<THREE.Mesh | null>(null);
  const rightLowerSleeveRef = useRef<THREE.Mesh | null>(null);

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
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
      
      // Create Torso with proper aspect ratio
      const torsoGeo = new THREE.PlaneGeometry(1, 1);
      const torso = new THREE.Mesh(torsoGeo, mat);
      scene.add(torso);
      torsoRef.current = torso;

      // Create Segmented Sleeves
      const sleeveGeo = new THREE.PlaneGeometry(0.5, 1);
      
      leftUpperSleeveRef.current = new THREE.Mesh(sleeveGeo, mat.clone());
      leftLowerSleeveRef.current = new THREE.Mesh(sleeveGeo, mat.clone());
      rightUpperSleeveRef.current = new THREE.Mesh(sleeveGeo, mat.clone());
      rightLowerSleeveRef.current = new THREE.Mesh(sleeveGeo, mat.clone());

      scene.add(leftUpperSleeveRef.current);
      scene.add(leftLowerSleeveRef.current);
      scene.add(rightUpperSleeveRef.current);
      scene.add(rightLowerSleeveRef.current);
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

    let active = true;
    const poseInstance = new pose.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    poseInstance.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    poseInstance.onResults((results) => {
      if (!active) return;
      setIsLoading(false);
      if (!results.poseLandmarks || !torsoRef.current) return;

      const landmarks = results.poseLandmarks;
      
      const getSmooth = (idx: number) => {
        if (!smoothers.current[idx]) smoothers.current[idx] = new EMASmoother(0.15);
        return smoothers.current[idx].smooth(landmarks[idx]);
      };

      const ls = getSmooth(11); // Left Shoulder
      const rs = getSmooth(12); // Right Shoulder
      const le = getSmooth(13); // Left Elbow
      const re = getSmooth(14); // Right Elbow
      const lw = getSmooth(15); // Left Wrist
      const rw = getSmooth(16); // Right Wrist
      const lh = getSmooth(23); // Left Hip
      const rh = getSmooth(24); // Right Hip

      // Calculate Torso metrics
      const centerX = (ls.x + rs.x) / 2;
      const centerY = (ls.y + rs.y) / 2;
      const shoulderWidth = Math.sqrt(Math.pow(ls.x - rs.x, 2) + Math.pow(ls.y - rs.y, 2));
      const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);

      // Torso Alignment
      torsoRef.current.position.set((centerX - 0.5) * 10, -(centerY - 0.5) * 8 - 1.2, 0.05);
      torsoRef.current.rotation.z = shoulderAngle;
      torsoRef.current.scale.set(shoulderWidth * 12, shoulderWidth * 16, 1);

      // Segmented Sleeve Logic
      if (leftUpperSleeveRef.current && leftLowerSleeveRef.current) {
        // Upper Left
        const angleUL = Math.atan2(le.y - ls.y, le.x - ls.x);
        leftUpperSleeveRef.current.position.set((ls.x - 0.5) * 10, -(ls.y - 0.5) * 8 - 0.4, 0.1);
        leftUpperSleeveRef.current.rotation.z = angleUL + Math.PI / 2;
        leftUpperSleeveRef.current.scale.set(shoulderWidth * 4, shoulderWidth * 6, 1);

        // Lower Left
        const angleLL = Math.atan2(lw.y - le.y, lw.x - le.x);
        leftLowerSleeveRef.current.position.set((le.x - 0.5) * 10, -(le.y - 0.5) * 8 - 0.4, 0.11);
        leftLowerSleeveRef.current.rotation.z = angleLL + Math.PI / 2;
        leftLowerSleeveRef.current.scale.set(shoulderWidth * 3.5, shoulderWidth * 5, 1);
      }

      if (rightUpperSleeveRef.current && rightLowerSleeveRef.current) {
        // Upper Right
        const angleUR = Math.atan2(re.y - rs.y, re.x - rs.x);
        rightUpperSleeveRef.current.position.set((rs.x - 0.5) * 10, -(rs.y - 0.5) * 8 - 0.4, 0.1);
        rightUpperSleeveRef.current.rotation.z = angleUR + Math.PI / 2;
        rightUpperSleeveRef.current.scale.set(shoulderWidth * 4, shoulderWidth * 6, 1);

        // Lower Right
        const angleLR = Math.atan2(rw.y - re.y, rw.x - re.x);
        rightLowerSleeveRef.current.position.set((re.x - 0.5) * 10, -(re.y - 0.5) * 8 - 0.4, 0.11);
        rightLowerSleeveRef.current.rotation.z = angleLR + Math.PI / 2;
        rightLowerSleeveRef.current.scale.set(shoulderWidth * 3.5, shoulderWidth * 5, 1);
      }

      // Size Recommendation (Rule-based engine with conservative bias)
      if (onSizeDetected) {
        const ratio = shoulderWidth * 100; // Normalized ratio
        let size = "M";
        let score = 0.95;
        let note = "Standard fit";

        if (ratio < 22) { size = "S"; note = "Fitted look recommended"; }
        else if (ratio > 32) { size = "XL"; note = "Relaxed fit for comfort"; }
        else if (ratio > 28) { size = "L"; note = "True to size"; }
        
        setCurrentSize(size);
        setCurrentNote(note);
        onSizeDetected(size, note);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });

    let camera: cam.Camera | null = null;
    if (videoRef.current) {
      camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          if (active && videoRef.current && videoRef.current.readyState === 4) {
            try {
              await poseInstance.send({ image: videoRef.current });
            } catch (e) {
              console.error("Pose detection error:", e);
            }
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }

    return () => {
      active = false;
      if (camera) {
        camera.stop();
      }
      poseInstance.close();
    };
  }, [mode, onSizeDetected]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        setIsLoading(true);
        const poseInstance = new pose.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        poseInstance.setOptions({ modelComplexity: 1 });
        poseInstance.onResults((results) => {
          setIsLoading(false);
          if (results.poseLandmarks && torsoRef.current) {
            // Re-use results logic or trigger update
            // For now, we'll just show the photo on the video element's place
            if (videoRef.current) {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              canvas.getContext("2d")?.drawImage(img, 0, 0);
              // This is a simplified version, in a real app we'd display the static image
            }
          }
          poseInstance.close();
        });
        await poseInstance.send({ image: img });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={handlePhotoUpload}
              onClick={() => setMode("photo")}
            />
            <Button variant={mode === "photo" ? "default" : "secondary"} size="sm" title="Upload your own photo for try-on">
              <Upload className="w-4 h-4 mr-2" /> Try with Photo
            </Button>
          </div>
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
