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
    if (!image) return;
    setIsProcessing(true);

    try {
      const poseInstance = new pose.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      poseInstance.setOptions({ modelComplexity: 1 });

      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const garmentImg = new Image();
      garmentImg.crossOrigin = "anonymous";

      await Promise.all([
        new Promise((resolve) => { img.onload = resolve; img.src = image; }),
        new Promise((resolve) => { garmentImg.onload = resolve; garmentImg.src = garmentUrl; })
      ]);

      poseInstance.onResults((results) => {
        if (results.poseLandmarks && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw original user photo
          ctx.drawImage(img, 0, 0);

          const landmarks = results.poseLandmarks;
          const leftShoulder = landmarks[11];
          const rightShoulder = landmarks[12];
          const leftHip = landmarks[23];
          const rightHip = landmarks[24];

          // Calculate placement
          const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * canvas.width;
          const torsoHeight = Math.abs(((leftShoulder.y + rightShoulder.y)/2) - ((leftHip.y + rightHip.y)/2)) * canvas.height;
          
          const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * canvas.width;
          const centerY = ((leftShoulder.y + rightShoulder.y) / 2) * canvas.height;

          // Scale garment
          const garmentScaleWidth = shoulderWidth * 2.3; // Increased for better coverage
          const garmentScaleHeight = garmentScaleWidth * (garmentImg.height / garmentImg.width);

          ctx.save();
          // Adjust vertical placement for a more natural look
          // Using a slight transparency for better blending with the user's photo
          ctx.globalAlpha = 0.95; 
          ctx.translate(centerX, centerY + (torsoHeight * 0.45));
          
          // Add a subtle drop shadow for depth
          ctx.shadowColor = "rgba(0,0,0,0.2)";
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = 10;

          ctx.drawImage(
            garmentImg, 
            -garmentScaleWidth / 2, 
            -garmentScaleHeight / 2, 
            garmentScaleWidth, 
            garmentScaleHeight
          );
          ctx.restore();

          setProcessedImage(canvas.toDataURL("image/png"));
          toast({ title: "Fitting Complete!", description: "We've matched the shirt to your body posture." });
        } else {
          toast({ 
            title: "Detection failed", 
            description: "We couldn't detect a person in the photo. Please try another one.",
            variant: "destructive"
          });
        }
        setIsProcessing(false);
        poseInstance.close();
      });

      await poseInstance.send({ image: img });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
      setIsProcessing(false);
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
                  <p className="font-bold text-lg">AI Fitting in progress...</p>
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
