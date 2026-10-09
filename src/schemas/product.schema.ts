import { z } from 'zod'

// Validates simple product creation (without stock)
export const createProductSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  name: z.string().trim().min(1, 'Product name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  price: z.number().nonnegative('Price must be 0 or greater')
})

// Validates URL params for SKU lookups (e.g., GET /products/:sku)
export const skuParamSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required')
})

// Inferred TypeScript types
export type CreateProductInput = z.infer<typeof createProductSchema>
export type SkuParamInput = z.infer<typeof skuParamSchema>
