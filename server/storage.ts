import { db } from "./db";
import { savedLooks, products, type InsertSavedLook, type SavedLook, type InsertProduct, type Product } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLooks(): Promise<SavedLook[]>;
  createLook(look: InsertSavedLook): Promise<SavedLook>;
  deleteLook(id: number): Promise<void>;
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
}

export class DatabaseStorage implements IStorage {
  async getLooks(): Promise<SavedLook[]> {
    return await db.select().from(savedLooks).orderBy(savedLooks.createdAt);
  }

  async createLook(look: InsertSavedLook): Promise<SavedLook> {
    const [newLook] = await db.insert(savedLooks).values(look).returning();
    return newLook;
  }

  async deleteLook(id: number): Promise<void> {
    await db.delete(savedLooks).where(eq(savedLooks.id, id));
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
}

export const storage = new DatabaseStorage();
