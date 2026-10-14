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

export const restockInventory = async (req:Request, res:Response) => {
  try {
    const payload = req.body
    const product = await db('products').select('*').where('sku', payload.sku).first()

    if(!product) {
      return res.status(404).json({error: `product with sku: ${payload.sku} not found`})
    }

    const [lotId] = await db('inventory_lots').insert({
      product_id: product.id,
      unit_cost: payload.unit_cost,
      qty_received: payload.qty_received,
      qty_remaining: payload.qty_received
    })

    return res.status(201).json({message: `new stock:${lotId} has been added successfully`})
  } catch(err:any) {
    res.status(500).json({error: 'something went wrong with the server'})
  }
}


export const createSale = async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty or items array is missing' });
  }

  try {
    const saleResult = await db.transaction(async (trx) => {
      let grandTotal = 0;
      const resolvedItems: Array<{
        productId: number;
        lotId: number;
        quantity: number;
        unitPrice: number;
      }> = [];

      // 1. FIRST PASS: Validate inventory, check stock, and calculate totals 
      // (This happens before touching the sales table, avoiding any CHECK constraint errors)
      for (const cartItem of items) {
        const { sku, quantity } = cartItem;

        const product = await trx('products').where({ sku }).first();
        if (!product) {
          throw new Error(`Product with SKU "${sku}" not found in catalog.`);
        }

        // Find available lots using FIFO
        const lots = await trx('inventory_lots')
          .where({ product_id: product.id })
          .andWhere('qty_remaining', '>', 0)
          .orderBy('id', 'asc');

        const totalAvailable = lots.reduce((sum, lot) => sum + lot.qty_remaining, 0);
        if (totalAvailable < quantity) {
          throw new Error(`Insufficient stock for "${product.name}" (${sku}). Requested: ${quantity}, Available: ${totalAvailable}`);
        }

        let remainingNeeded = quantity;

        // Map out how much comes from which lots
        for (const lot of lots) {
          if (remainingNeeded <= 0) break;

          const takeFromThisLot = Math.min(remainingNeeded, lot.qty_remaining);

          resolvedItems.push({
            productId: product.id, //fix this in ts
            lotId: lot.id, //and this here too
            quantity: takeFromThisLot,
            unitPrice: product.price,
          });

          grandTotal += takeFromThisLot * product.price;
          remainingNeeded -= takeFromThisLot;
        }
      }

      // 2. Insert the main sale header with the real grandTotal (Satisfies your CHECK constraint!)
      const [saleId] = await trx('sales').insert({ total_amount: grandTotal });

      // 3. Insert all line items (Firing the trigger to deduct lot stock automatically)
      for (const item of resolvedItems) {
        await trx('sale_items').insert({
          sale_id: saleId,
          product_id: item.productId,
          lot_id: item.lotId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        });
      }

      return { saleId, grandTotal };
    });

    return res.status(201).json({
      message: 'Sale completed successfully!',
      sale_id: saleResult.saleId,
      total_amount: saleResult.grandTotal,
    });

  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Checkout failed due to a server error.' });
  }
};

export const getDashboardData = async (req:Request, res:Response) => {
  try {
    const dashboardData = await db('products as p')
      .join('inventory_lots as i', 'i.product_id', 'p.id')
      .select('p.id', 'p.sku', 'p.name', 'p.category', 'p.price', 
        'i.qty_received', 'i.qty_remaining', 'i.unit_cost', 'i.created_at')
    
    return res.status(200).json({data: dashboardData})
  } catch(err: any) {
    return res.status(500).json({error: err})
  }
}
