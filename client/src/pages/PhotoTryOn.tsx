import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, ArrowLeft, Check, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pose from "@mediapipe/pose";

export default function PhotoTryOn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("Preparing...");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const params = new URLSearchParams(window.location.search);
  const garmentUrl = params.get("garment") || "/tshirt-front.png";

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setProcessedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!image || !canvasRef.current) return;
    setIsProcessing(true);
    setProcessingStatus("Processing your look...");

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas");

      // Load images
      const [userImg, garmentImg] = await Promise.all([
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = image;
        }),
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = garmentUrl;
        })
      ]);

      // Use MediaPipe for pose detection
      const poseDetector = new pose.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      poseDetector.setOptions({
        modelComplexity: 2, // Use more accurate model
        smoothLandmarks: true,
        minDetectionConfidence: 0.7, // Higher confidence for better accuracy
        minTrackingConfidence: 0.7,
      });

      let results: any = null;
      await new Promise<void>((resolve) => {
        poseDetector.onResults((r) => {
          results = r;
          resolve();
        });
        poseDetector.send({ image: userImg });
      });

      if (!results || !results.poseLandmarks) {
        throw new Error("No person detected in the photo. Please use a clear full-body photo.");
      }

      // Draw the overlay
      canvas.width = userImg.width;
      canvas.height = userImg.height;
      ctx.drawImage(userImg, 0, 0);

      // Advanced alignment based on multiple landmarks
      const posePoints = results.poseLandmarks;
      const leftShoulder = posePoints[11];
      const rightShoulder = posePoints[12];
      const leftHip = posePoints[23];
      const rightHip = posePoints[24];
      
      // Calculate torso center and rotation
      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2 * canvas.width;
      const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2 * canvas.height;
      
      // Calculate angle from left to right shoulder
      const dx = (rightShoulder.x - leftShoulder.x) * canvas.width;
      const dy = (rightShoulder.y - leftShoulder.y) * canvas.height;
      const torsoAngle = Math.atan2(dy, dx);
      
      const shoulderWidth = Math.sqrt(dx * dx + dy * dy);

      // Scaling factor: garment should be wider than shoulders to cover torso
      const shirtWidth = shoulderWidth * 2.6; 
      const shirtHeight = shirtWidth * (garmentImg.height / garmentImg.width);

      // Positioning: Center on mid-shoulder and rotate with torso
      ctx.save();
      // Move to center point
      ctx.translate(midShoulderX, midShoulderY);
      
      // Rotate based on shoulder angle
      ctx.rotate(torsoAngle);
      
      // Adjust vertical offset to place neckline naturally at the shoulder line
      // A positive value here moves the shirt DOWN relative to the shoulders
      const verticalOffset = shirtHeight * 0.05; 
      
      ctx.drawImage(garmentImg, -shirtWidth / 2, verticalOffset, shirtWidth, shirtHeight);
      ctx.restore();
      
      const dataUrl = canvas.toDataURL("image/png");
      setProcessedImage(dataUrl);
      
      toast({ title: "Fitting Complete!", description: "The garment has been fitted locally." });
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process image.", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus("Preparing...");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="font-bold text-lg">Virtual Try-On</h1>
        <div className="w-20" />
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-8">
        {!image ? (
          <Card 
            className="aspect-[3/4] border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors bg-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold">Upload your photo</h2>
            <p className="text-zinc-500 text-center px-12 mt-2">
              For best results, use a full-body or half-body photo facing the camera.
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleUpload} 
            />
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="relative aspect-[3/4] bg-zinc-200 rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={processedImage || image} 
                className="w-full h-full object-contain" 
                alt="Your photo" 
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold text-lg">{processingStatus}</p>
                  <p className="text-sm text-white/70 mt-2">This may take up to 30 seconds</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {!processedImage ? (
                <Button 
                  className="flex-1 h-14 text-lg font-bold rounded-2xl bg-black hover:bg-zinc-800"
                  onClick={processImage}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Process Try-On"}
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    className="flex-1 h-14 text-lg font-bold rounded-2xl border-zinc-200"
                    onClick={() => { setImage(null); setProcessedImage(null); }}
                  >
                    Retake
                  </Button>
                  <Button 
                    className="flex-1 h-14 text-lg font-bold rounded-2xl bg-black hover:bg-zinc-800"
                  >
                    <Download className="w-5 h-5 mr-2" /> Download
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl border border-zinc-200 space-y-4">
          <h3 className="font-bold">Currently Trying On:</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden p-2">
              <img src={garmentUrl} className="w-full h-full object-contain" alt="Garment" />
            </div>
            <div>
              <p className="font-bold">Selected Item</p>
              <p className="text-sm text-zinc-500 uppercase tracking-widest">Premium Collection</p>
            </div>
          </div>
        </div>
      </main>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
