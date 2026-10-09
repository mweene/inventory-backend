import type { Request, Response } from 'express'
import { db } from '../db/db.js'
import type { CreateProductWithStockInput } from '../schemas/inventory.schema.js'
import type { CreateProductInput } from '../schemas/product.schema.js'

export const root = (req: Request, res: Response) => {
  return res.status(200).json({ data: 'inventory api is alive and kicking' })
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await db('products').select('*')
    return res.json({ data: products })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch products' })
  }
}

export const getProductBySku = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params

    // Let SQLite perform the lookup instead of pulling all rows into JS
    const product = await db('products').where('sku', sku).first()

    if (!product) {
      return res.status(404).json({ error: `Product with SKU "${sku}" does not exist` })
    }

    return res.status(200).json({ message: 'SKU exists', data: product })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to query product' })
  }
}

export const createProduct = async (req: Request, res: Response) => {
  const payload:CreateProductInput = req.body

  try {
    const [productId] = await db('products').insert({
      sku: payload.sku, 
      name: payload.name, 
      category: payload.category, 
      price: payload.price 
    })

    return res.status(201).json({
      message: `Product with ID "${productId}" was created successfully`,
      data: { id: productId, ...payload }
    })
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'A product with this SKU already exists' })
    }
    return res.status(500).json({ error: err.message || 'Failed to create product' })
  }
}

export const createProductWithStock = async (req: Request, res: Response) => {
  const payload:CreateProductWithStockInput = req.body

  return db.transaction(async (trx) => {
    try {
      const [productId] = await trx('products').insert({
        sku: payload.sku,
        name: payload.name,
        category: payload.category,
        price: payload.price
      })

      const [lotId] = await trx('inventory_lots').insert({
        product_id: productId,
        qty_received: payload.qty_received,
        qty_remaining: payload.qty_received, // Default remaining stock to received quantity
        unit_cost: payload.unit_cost
      })

      return res.status(201).json({
        message: `Product "${payload.name}" and initial stock created successfully!`,
        data: {
          product_id: productId,
          lot_id: lotId,
          sku: payload.sku,
          stock_added: payload.qty_received // Fixed spelling typo
        }
      })
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'A product with this SKU already exists' })
      }
      return res.status(500).json({ error: err.message || 'Failed to create product with stock record' })
    }
  })
}

export const getDashboardData = async (req:Request, res:Response) => {
  try {
    const dashboardData = await db('products as p')
      .join('inventory_lots as i', 'i.product_id', 'p.id')
      .select('p.id', 'p.name', 'p.category', 'p.price', 
        'i.qty_received', 'i.qty_remaining', 'i.unit_cost', 'i.created_at')
    
    return res.status(200).json({data: dashboardData})
  } catch(err: any) {
    return res.status(500).json({error: err})
  }
}
