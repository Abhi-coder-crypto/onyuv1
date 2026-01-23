import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const savedLooks = pgTable("saved_looks", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  anchorPoints: text("anchor_points"), // JSON string of anchor points
});

export const tryOnSessions = pgTable("try_on_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  userPhotoUrl: text("user_photo_url"),
  detectedSize: text("detected_size"),
  confidenceScore: text("confidence_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedLookSchema = createInsertSchema(savedLooks).omit({ 
  id: true, 
  createdAt: true 
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true
});

export const insertTryOnSessionSchema = createInsertSchema(tryOnSessions).omit({
  id: true,
  createdAt: true
});

export type SavedLook = typeof savedLooks.$inferSelect;
export type InsertSavedLook = z.infer<typeof insertSavedLookSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type TryOnSession = typeof tryOnSessions.$inferSelect;
export type InsertTryOnSession = z.infer<typeof insertTryOnSessionSchema>;
