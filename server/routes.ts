import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { uploadToLocalStorage } from "./local-storage";
import { geminiProcessor } from "./gemini-tryon";
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

  app.get("/api/try-on/queue-status", (req, res) => {
    const status = geminiProcessor.getQueueStatus();
    res.json(status);
  });

  app.post("/api/try-on/process", async (req, res) => {
    try {
      const { userPhotoUrl, garmentUrl } = req.body;
      
      if (!userPhotoUrl || !garmentUrl) {
        return res.status(400).json({ message: "Missing userPhotoUrl or garmentUrl" });
      }

      const host = `${req.protocol}://${req.get("host")}`;

      console.log("Processing try-on with Gemini:", { userPhotoUrl, garmentUrl });
      
      const resultImage = await geminiProcessor.addToQueue(userPhotoUrl, garmentUrl, host);
      
      res.json({ image: { url: resultImage } });
    } catch (err: any) {
      console.error("Try-on Processing Error:", err);
      
      const isRateLimit = err.message?.includes("rate") || err.message?.includes("quota");
      const status = isRateLimit ? 429 : 500;
      const message = isRateLimit 
        ? "Rate limit reached. Please wait a moment and try again."
        : (err.message || "Failed to process try-on");
      
      res.status(status).json({ message });
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
