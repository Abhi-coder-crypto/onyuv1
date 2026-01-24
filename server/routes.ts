import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { uploadToLocalStorage } from "./local-storage";
import { client } from "@gradio/client";
import express from "express";
import path from "path";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get(api.looks.list.path, async (req, res) => {
    const looks = await storage.getLooks();
    res.json(looks);
  });

  app.post(api.looks.create.path, async (req, res) => {
    try {
      const input = api.looks.create.input.parse(req.body);
      const look = await storage.createLook(input);
      res.status(201).json(look);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.looks.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteLook(id);
    res.json({ success: true });
  });

  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post("/api/try-on/process", async (req, res) => {
    try {
      const { userPhotoUrl, garmentUrl } = req.body;
      
      const fullUserPhotoUrl = userPhotoUrl.startsWith("http") 
        ? userPhotoUrl 
        : `${req.protocol}://${req.get("host")}${userPhotoUrl}`;

      const fullGarmentUrl = garmentUrl.startsWith("http")
        ? garmentUrl
        : `${req.protocol}://${req.get("host")}${garmentUrl}`;

      // Use IDM-VTON on Hugging Face (Free)
      try {
        const hfToken = process.env.HF_TOKEN as `hf_${string}` | undefined;
        if (!hfToken) {
          console.warn("HF_TOKEN is missing in environment variables");
        }
        
        const clientOptions = { 
          hf_token: hfToken,
        };

        // Create a wrapper to catch the early 'error' event that crashes the server
        const result = await new Promise(async (resolve, reject) => {
          let finished = false;
          const timeout = setTimeout(() => {
            if (!finished) {
              finished = true;
              reject(new Error("AI processing timed out"));
            }
          }, 90000);

          // List of alternative spaces to try if the primary one fails
          const spaces = ["yisol/IDM-VTON", "kadirnar/IDM-VTON", "pngwn/IDM-VTON"];
          let lastError = null;

          for (const space of spaces) {
            try {
              console.log(`Attempting to use AI space: ${space}`);
              
              // We use a temporary promise to handle the client connection
              const hfApp = await Promise.race([
                client(space, clientOptions),
                new Promise((_, r) => setTimeout(() => r(new Error(`Timeout connecting to ${space}`)), 15000))
              ]) as any;
              
              // Handle asynchronous errors emitted by the Gradio client
              if (hfApp && typeof hfApp.on === 'function') {
                hfApp.on("error", (err: any) => {
                  console.error(`Gradio Client Async Error in ${space}:`, err);
                  // Don't reject here if already finished, but this helps log the 403s
                });
              }

              const predictResult = await hfApp.predict("/tryon", [
                {
                  background: fullUserPhotoUrl,
                  layers: [],
                  composite: null
                },
                fullGarmentUrl,
                "t-shirt",
                true,
                false,
                30,
                42
              ]);
              
              if (!finished) {
                finished = true;
                clearTimeout(timeout);
                resolve(predictResult);
                return;
              }
            } catch (err: any) {
              console.error(`Space ${space} failed:`, err.message);
              lastError = err;
              // If we get a 403, we definitely want to try the next space
              continue; 
            }
          }

          if (!finished) {
            finished = true;
            clearTimeout(timeout);
            reject(lastError || new Error("All AI spaces failed"));
          }
        });

        const output = result as any;
        if (output.data && Array.isArray(output.data) && output.data[0]) {
          res.json({ image: { url: output.data[0].url } });
        } else {
          throw new Error("No image generated");
        }
      } catch (err: any) {
        console.error("VTON Processing Error:", err);
        // Map 403 to a more user-friendly message
        const is403 = err.message?.includes("403") || (err.status === 403);
        const status = is403 ? 403 : 500;
        const message = is403
          ? "The AI service is currently unavailable (403 Forbidden). Please try again in a few minutes or check your HF_TOKEN." 
          : (err.message || "Failed to process try-on");
        
        res.status(status).json({ message });
      }
    } catch (err: any) {
      console.error("Internal Server Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "An internal server error occurred" });
      }
    }
  });

  app.post("/api/try-on/session", async (req, res) => {
    try {
      const { userPhotoBase64, ...sessionData } = req.body;
      let userPhotoUrl = sessionData.userPhotoUrl;

      if (userPhotoBase64) {
        userPhotoUrl = await uploadToLocalStorage(userPhotoBase64);
      }

      const session = await storage.createTryOnSession({
        ...sessionData,
        userPhotoUrl,
        garmentId: sessionData.garmentId || 1, // Ensure garmentId is provided
      });
      res.status(201).json(session);
    } catch (err: any) {
      console.error("Session creation error details:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
        detail: err.detail
      });
      res.status(400).json({ 
        message: "Could not create session",
        error: err.message 
      });
    }
  });

  app.get("/api/try-on/session/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const session = await storage.getTryOnSession(id);
    if (!session) return res.status(404).json({ message: "Not found" });
    res.json(session);
  });

  return httpServer;
}
