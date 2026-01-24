import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { uploadToCloudinary } from "./cloudinary";
import { Client } from "@gradio/client";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      
      // Use IDM-VTON on Hugging Face (Free)
      const client = await Client.connect("yisol/IDM-VTON");
      const result = await client.predict("/tryon", {
        dict: {
          background: userPhotoUrl,
          layers: [],
          composite: null
        },
        garm_img: garmentUrl,
        garment_des: "t-shirt",
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: 42
      });

      // Gradio returns an array of results, the image is typically at index 0
      if (result.data && Array.isArray(result.data) && result.data[0]) {
        res.json({ image: { url: (result.data[0] as any).url } });
      } else {
        throw new Error("No image generated");
      }
    } catch (err: any) {
      console.error("VTON Error:", err);
      res.status(500).json({ message: err.message || "Failed to process try-on" });
    }
  });

  app.post("/api/try-on/session", async (req, res) => {
    try {
      const { userPhotoBase64, ...sessionData } = req.body;
      let userPhotoUrl = sessionData.userPhotoUrl;

      if (userPhotoBase64) {
        userPhotoUrl = await uploadToCloudinary(userPhotoBase64);
      }

      const session = await storage.createTryOnSession({
        ...sessionData,
        userPhotoUrl,
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
