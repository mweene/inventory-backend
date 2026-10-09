import { z } from 'zod'

export const createProductWithStockSchema = z.object({
  // Product identity fields
  sku: z.string().trim().min(1, 'SKU is required'),
  name: z.string().trim().min(1, 'Product name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  price: z.number().nonnegative('Price must be 0 or greater'),

  // Initial Inventory Lot fields
  qty_received: z.number().int().positive('Initial stock quantity must be at least 1'),
  unit_cost: z.number().nonnegative('Unit cost price cannot be negative')
})

// Standalone restock schema (for restocking an existing product)
export const restockLotSchema = z.object({
  product_id: z.number().int().positive('Valid product ID is required'),
  qty_received: z.number().int().positive('Quantity must be at least 1'),
  unit_cost: z.number().nonnegative('Unit cost price cannot be negative')
})

// Inferred TypeScript types
export type CreateProductWithStockInput = z.infer<typeof createProductWithStockSchema>
export type RestockLotInput = z.infer<typeof restockLotSchema>
