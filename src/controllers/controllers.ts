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

  return 
}
