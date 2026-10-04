import type { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import db from '../db/db.js'

const root = (req:Request, res:Response) => {
  res.status(200).json({data: 'inventory api is alive and kicking'})
}

const getProducts = async (req:Request, res:Response) => {
  try {
    const query = 'SELECT * FROM products LIMIT = ? OFFSET = ?'
    const products = await db.prepare(query).all(10, 10)

    res.status(200).json({data: products.row})
  } catch (err: any){
    res.status(500).json({error: err})
  }
}

export {
  root,
  getProducts
}
