import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { openDb } from '@techparts/shared';

// TODO(workshop): Implement the inventory tools.
//
// You are building two tools backed by the SQLite `products` table
// (columns: sku, name, category, price, stock, warehouse):
//   1. search_products — find products by free text, category and/or max price.
//   2. get_stock        — stock level + warehouse for a single SKU.
//
// Use openDb() to query the database (see shared/src/db.ts), and let the tests
// in test/tools.test.ts describe the exact shapes you need to return.

export function searchProducts(input: { query?: string; category?: string; maxPrice?: number }): { products: any[] } {
  const db = openDb();
  const where: string[] = [];
  const params: any[] = [];

  if (input.query) {
    const words = String(input.query).trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const w of words) {
      where.push('(LOWER(sku) LIKE ? OR LOWER(name) LIKE ?)');
      params.push(`%${w}%`, `%${w}%`);
    }
  }

  if (input.category) {
    where.push('category = ?');
    params.push(input.category);
  }

  if (typeof input.maxPrice === 'number') {
    where.push('price <= ?');
    params.push(input.maxPrice);
  }

  const sql = `SELECT sku, name, category, price FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
  const products = db.prepare(sql).all(...params);
  return { products };
}

export function getStock(input: { sku: string }): any {
  const db = openDb();
  const row = db.prepare('SELECT sku, stock, warehouse FROM products WHERE LOWER(sku) = LOWER(?)').get(input.sku);
  if (!row) return { error: `Unknown SKU: ${input.sku}` };
  return { sku: row.sku, stock: row.stock, warehouse: row.warehouse };
}

export const searchProductsTool = new FunctionTool({
  name: 'search_products',
  description: 'Find products by free-text, category and/or maximum price.',
  parameters: z.object({
    query: z.string().optional().describe('Free-text query to match product sku or name'),
    category: z.string().optional().describe('Product category to filter by'),
    maxPrice: z.number().optional().describe('Maximum price to include'),
  }),
  execute: async (args: any) => searchProducts(args ?? {}),
});

export const getStockTool = new FunctionTool({
  name: 'get_stock',
  description: 'Return stock level and warehouse for a given product SKU (case-insensitive).',
  parameters: z.object({
    sku: z.string().describe('Product SKU to look up (case-insensitive)'),
  }),
  execute: async (args: any) => getStock(args ?? { sku: '' }),
});
