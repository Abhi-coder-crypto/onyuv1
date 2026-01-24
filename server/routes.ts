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
      let gradioApp: any;
      try {
        const hfToken = process.env.HF_TOKEN as `hf_${string}` | undefined;
        
        // Use a more robust way to initialize and call the client
        // to prevent unhandled 'error' events from crashing the server
        const clientOptions = { 
          hf_token: hfToken,
          status_callback: (status: any) => {
            if (status.status === "error") {
              console.error("Gradio Status Error:", status.message);
            }
          }
        };

        const result = await Promise.race([
          (async () => {
            const app = await client("yisol/IDM-VTON", clientOptions);
            
            // Add a local error handler to the client instance if possible
            if (app && (app as any).event_source) {
              (app as any).event_source.onerror = (err: any) => {
                console.error("Gradio EventSource Error (Local):", err);
              };
            }

            return await app.predict("/tryon", [
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
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("AI processing timed out")), 60000))
        ]);

        const output = result as any;
        if (output.data && Array.isArray(output.data) && output.data[0]) {
          res.json({ image: { url: output.data[0].url } });
        } else {
          throw new Error("No image generated");
        }
      } catch (err: any) {
        console.error("VTON Processing Error:", err);
        const status = err.message?.includes("403") ? 403 : 500;
        const message = err.message?.includes("403") 
          ? "AI service is currently restricted. Please ensure your HF_TOKEN has 'read' permissions." 
          : (err.message || "Failed to process try-on");
        
        res.status(status).json({ message });
      }
    } catch (err: any) {
      console.error("Internal Server Error:", err);
      res.status(500).json({ message: "An internal server error occurred" });
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
    } catch (err) {
      console.error("Session creation error:", err);
      res.status(400).json({ message: "Could not create session" });
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
