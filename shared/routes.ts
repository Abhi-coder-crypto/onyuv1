import { z } from 'zod';
import { insertSavedLookSchema, savedLooks, products } from './schema';

export const api = {
  looks: {
    list: {
      method: 'GET' as const,
      path: '/api/looks',
      responses: {
        200: z.array(z.custom<typeof savedLooks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/looks',
      input: insertSavedLookSchema,
      responses: {
        201: z.custom<typeof savedLooks.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/looks/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
