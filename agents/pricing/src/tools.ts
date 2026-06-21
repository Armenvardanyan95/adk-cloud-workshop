import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { openDb } from '@techparts/shared';

interface PriceRow {
  sku: string;
  name: string;
  price: number;
}

export function getOurPrice(input: { skuOrName: string }): any {
  const db = openDb();
  try {
let row = db
      .prepare('SELECT sku, name, price FROM products WHERE sku = ? COLLATE NOCASE')
      .get(input.skuOrName) as unknown as PriceRow | undefined;
      
      // 2) Fallback: partial name match (pick the most expensive matching result)
    if (!row) {
      row = db
        .prepare('SELECT sku, name, price FROM products WHERE name LIKE ? ORDER BY price DESC LIMIT 1')
        .get(`%${input.skuOrName}%`) as unknown as PriceRow | undefined;
    }
    
    if (!row) {
      return { error: `No product found matching '${input.skuOrName}'.` };
    }

    return { sku: row.sku, name: row.name, ourPrice: row.price };
  
} finally {
    db.close();
  }
}

export const getOurPriceTool = new FunctionTool({
  name: 'get_our_price',
  description: "Look up TechParts' selling price for a product by SKU or partial product name.",
  parameters: z.object({
    skuOrName: z.string().describe('Product SKU (e.g. SONY-WH1000XM5) or part of the product name (e.g. "WH-1000XM5").'),
  }),
  execute: getOurPrice,
});
