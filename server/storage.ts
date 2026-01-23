import { db } from "./db";
import { savedLooks, products, tryOnSessions, type InsertSavedLook, type SavedLook, type InsertProduct, type Product, type TryOnSession, type InsertTryOnSession } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLooks(): Promise<SavedLook[]>;
  createLook(look: InsertSavedLook): Promise<SavedLook>;
  deleteLook(id: number): Promise<void>;
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  createTryOnSession(session: InsertTryOnSession): Promise<TryOnSession>;
  getTryOnSession(id: number): Promise<TryOnSession | undefined>;
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

  async createTryOnSession(session: InsertTryOnSession): Promise<TryOnSession> {
    const [newSession] = await db.insert(tryOnSessions).values(session).returning();
    return newSession;
  }

  async getTryOnSession(id: number): Promise<TryOnSession | undefined> {
    const [session] = await db.select().from(tryOnSessions).where(eq(tryOnSessions.id, id));
    return session;
  }
}

export const storage = new DatabaseStorage();
