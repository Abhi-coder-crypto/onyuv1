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
});

export const insertSavedLookSchema = createInsertSchema(savedLooks).omit({ 
  id: true, 
  createdAt: true 
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true
});

export type SavedLook = typeof savedLooks.$inferSelect;
export type InsertSavedLook = z.infer<typeof insertSavedLookSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
