import { useEffect, useRef, useState } from "react";
import * as pose from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Upload, RotateCcw } from "lucide-react";

interface TryOnProps {
  garmentUrl: string;
  onSizeDetected?: (size: string) => void;
}

export function VirtualTryOn({ garmentUrl, onSizeDetected }: TryOnProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"photo" | "live">("live");

  // Three.js State
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const shirtMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    // Initialize Three.js
    if (!threeCanvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(640, 480);
    threeCanvasRef.current.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    camera.position.z = 5;
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Load Garment Texture
    const loader = new THREE.TextureLoader();
    loader.load(garmentUrl, (texture) => {
      const geometry = new THREE.PlaneGeometry(3, 4);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        side: THREE.DoubleSide 
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      shirtMeshRef.current = mesh;
    });

    return () => {
      renderer.dispose();
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
      if (!results.poseLandmarks || !shirtMeshRef.current) return;

      // Update Three.js Shirt Position based on shoulders
      const leftShoulder = results.poseLandmarks[11];
      const rightShoulder = results.poseLandmarks[12];
      
      const centerX = (leftShoulder.x + rightShoulder.x) / 2;
      const centerY = (leftShoulder.y + rightShoulder.y) / 2;
      const width = Math.abs(leftShoulder.x - rightShoulder.x);

      // Convert MediaPipe coords (0-1) to Three.js coords
      shirtMeshRef.current.position.x = (centerX - 0.5) * 10;
      shirtMeshRef.current.position.y = -(centerY - 0.5) * 8;
      shirtMeshRef.current.scale.set(width * 8, width * 8, 1);

      // Size Detection Logic
      if (onSizeDetected) {
        const shoulderDist = Math.sqrt(
          Math.pow(leftShoulder.x - rightShoulder.x, 2) + 
          Math.pow(leftShoulder.y - rightShoulder.y, 2)
        );
        let size = "M";
        if (shoulderDist < 0.25) size = "S";
        else if (shoulderDist > 0.35) size = "XL";
        else if (shoulderDist > 0.3) size = "L";
        onSizeDetected(size);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          await poseInstance.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, [mode, onSizeDetected]);

  return (
    <Card className="relative overflow-hidden aspect-video bg-black flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-50">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Initializing AI Camera...</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover grayscale opacity-50"
        playsInline
      />
      
      <div 
        ref={threeCanvasRef} 
        className="absolute inset-0 z-10 pointer-events-none" 
      />

      <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2 z-20">
        <div className="flex gap-2">
          <Button 
            variant={mode === "live" ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode("live")}
            data-testid="button-mode-live"
          >
            <Camera className="w-4 h-4 mr-2" />
            Live
          </Button>
          <Button 
            variant={mode === "photo" ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode("photo")}
            data-testid="button-mode-photo"
          >
            <Upload className="w-4 h-4 mr-2" />
            Photo
          </Button>
        </div>
        <Button variant="outline" size="icon" data-testid="button-reset">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
