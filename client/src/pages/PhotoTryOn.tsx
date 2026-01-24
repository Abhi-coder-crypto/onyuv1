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
      // 1. Upload user photo to Cloudinary first to get a URL
      const sessionResponse = await fetch("/api/try-on/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhotoBase64: image,
          garmentUrl: garmentUrl,
          garmentId: 1 // Default ID
        }),
      });

      if (!sessionResponse.ok) throw new Error("Failed to upload photo");
      const session = await sessionResponse.json();

      // 2. Call our backend proxy for Hugging Face VTON
      const vtonResponse = await fetch("/api/try-on/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPhotoUrl: session.userPhotoUrl,
          garmentUrl: window.location.origin + garmentUrl
        }),
      });

      if (!vtonResponse.ok) {
        const errorData = await vtonResponse.json();
        throw new Error(errorData.message || "AI processing failed");
      }

      const result = await vtonResponse.json();
      
      if (result.image?.url) {
        setProcessedImage(result.image.url);
        toast({ title: "Fitting Complete!", description: "The AI has realistically fitted the garment." });
      } else {
        throw new Error("No image returned from AI");
      }
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process image.", 
        variant: "destructive" 
      });
    } finally {
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
