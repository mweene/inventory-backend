import type { Request, Response } from 'express'
import { db, initDB } from '../db/db.js'

initDB() //place this function somewhere else

export const root = (req:Request, res:Response) => {
  res.status(200).json({data: 'inventory api is alive and kicking'})
}

export const getProducts = async (req:Request, res:Response) => {
  try {
    const products = await db('products').select('*')
    return res.json({data: products})
  } catch (err: any){
    return res.status(500).json({error: err})
  }
}

export const getProductBySku = async (req:Request, res:Response) => {
  try {
    const sku = req.params.sku
    const products = await db('products').select('sku')

    if(!products.find(p => p.sku === sku)) {
      return res.status(500).json({error: 'sku does not exists'})
    }
    return res.status(200).json({message: 'sku exists'})
  } catch(err:any) {
    return res.status(500).json({error: err})
  } 
} // change later

export const createProduct = async (req:Request, res:Response) => {
  try {
    const { sku, name, category, price } = req.body
    const [productId] = await db('products').insert({sku, name, category, price})

    return res.status(201).json({message: `product with id: "${productId}" was created successfully`})
  } catch(err: any) {
    return res.status(500).json({error: err})
  }
}

export const createProductWithStock = async (req:Request, res:Response) => {
  const payload = req.body
  const products = await db('products').select('*')
  if(products.find(p => p.sku === payload.sku)) {
    return res.status(409).json({error: `Product with sku: "${payload.sku}" exists`})
  }

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
        qty_remaining: payload.qty_remaining,
        unit_cost: payload.unit_cost
      })

      return res.status(201).json({
        message: `Product "${payload.name}" and initial stock created successfully!`,
        data: {
          product_id: productId,
          lot_id: lotId,
          sku: payload.sku,
          stock_added: payload.qty_recieved
        }
      })
    } catch(err:any) {
      if(err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({error: 'A product with this sku already exists'})
      }
      return res.status(500).json({error: 'Failed to create product with stock record'})
    }
  })
}
