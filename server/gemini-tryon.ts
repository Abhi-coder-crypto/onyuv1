import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60000;

interface QueueItem {
  id: string;
  userPhotoUrl: string;
  garmentUrl: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class GeminiTryOnProcessor {
  private queue: QueueItem[] = [];
  private processing = false;
  private requestTimestamps: number[] = [];
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private async getImageAsBase64(url: string, host: string): Promise<{ data: string; mimeType: string }> {
    let imageUrl = url;
    
    if (!url.startsWith("http")) {
      imageUrl = `${host}${url}`;
    }

    if (url.startsWith("/uploads/") || url.startsWith("/")) {
      const localPath = path.join(process.cwd(), url.startsWith("/") ? url.slice(1) : url);
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
        return {
          data: buffer.toString("base64"),
          mimeType
        };
      }
    }

    const response = await globalThis.fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/png";
    
    return {
      data: buffer.toString("base64"),
      mimeType: contentType
    };
  }

  private cleanOldTimestamps(): void {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < RATE_WINDOW_MS
    );
  }

  private canMakeRequest(): boolean {
    this.cleanOldTimestamps();
    return this.requestTimestamps.length < RATE_LIMIT;
  }

  private getWaitTime(): number {
    if (this.requestTimestamps.length === 0) return 0;
    
    this.cleanOldTimestamps();
    if (this.requestTimestamps.length < RATE_LIMIT) return 0;
    
    const oldestTimestamp = this.requestTimestamps[0];
    return RATE_WINDOW_MS - (Date.now() - oldestTimestamp) + 100;
  }

  async addToQueue(userPhotoUrl: string, garmentUrl: string, host: string): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        userPhotoUrl,
        garmentUrl,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue(host);
    });
  }

  private async processQueue(host: string): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime();
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      this.queue.shift();
      
      try {
        const result = await this.processItem(item, host);
        item.resolve(result);
      } catch (error: any) {
        item.reject(error);
      }
    }

    this.processing = false;
  }

  private async processItem(item: QueueItem, host: string): Promise<string> {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    this.requestTimestamps.push(Date.now());

    try {
      const [userImage, garmentImage] = await Promise.all([
        this.getImageAsBase64(item.userPhotoUrl, host),
        this.getImageAsBase64(item.garmentUrl, host)
      ]);

      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
      }, { apiVersion: "v1" });

      const prompt = `You are a virtual try-on assistant. Take the person in the first image and show them wearing the garment from the second image. 
      
Create a realistic composite image showing the person wearing the clothing item. The result should look natural and properly fitted on the person's body. 
Keep the person's face, pose, and background the same - only change their clothing to match the garment provided.

Generate only the final image without any text or explanation.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: userImage.data,
            mimeType: userImage.mimeType
          }
        },
        {
          inlineData: {
            data: garmentImage.data,
            mimeType: garmentImage.mimeType
          }
        }
      ]);

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;

      if (parts) {
        for (const part of parts) {
          if ((part as any).inlineData) {
            const imageData = (part as any).inlineData;
            const base64Image = `data:${imageData.mimeType};base64,${imageData.data}`;
            return base64Image;
          }
        }
      }

      throw new Error("No image generated by Gemini");
    } catch (error: any) {
      console.error("Gemini processing error:", error);
      throw new Error(`Failed to process try-on: ${error.message}`);
    }
  }

  getQueueStatus(): { queueLength: number; estimatedWaitMs: number } {
    this.cleanOldTimestamps();
    const waitTime = this.getWaitTime();
    const queueWait = this.queue.length * 4000;
    
    return {
      queueLength: this.queue.length,
      estimatedWaitMs: waitTime + queueWait
    };
  }
}

export const geminiProcessor = new GeminiTryOnProcessor();
