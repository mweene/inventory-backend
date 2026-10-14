import knex from 'knex'

export interface Product {
  id?: number
  sku: string
  name: string
  category: string
  price: number
}

export interface InventoryLot {
  id?: number
  product_id: number
  qty_received: number
  qty_remaining: number
  unit_cost: number
  created_at?: string
}

export interface Sale {
  id?: number
  total_amount: number
  created_at?: string
}

export interface SaleItem {
  id?: number
  sale_id: number
  product_id: number
  lot_id: number
  quantity: number
  unit_price: number
  total_price?: number
}

declare module 'knex/types/tables.js' {
  interface Tables {
    products: Product
    inventory_lots: InventoryLot
    sales: Sale
    sale_items: SaleItem
  }
}

export const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: 'database/inventory.db'
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn: any, cb: any) => {
      conn.pragma('journal_mode = WAL')
      conn.pragma('synchronous = NORMAL')
      conn.pragma('foreign_keys = ON')
      cb()
    }
  }
})

export const initDB = async () => {
  if (!(await db.schema.hasTable('products'))) {
    await db.schema.createTable('products', (table) => {
      table.increments('id').primary()
      table.string('sku').notNullable().unique()
      table.string('name').notNullable()
      table.string('category').notNullable()
      table.float('price').notNullable().defaultTo(0)
    })
  }

  if (!(await db.schema.hasTable('inventory_lots'))) {
    await db.schema.createTable('inventory_lots', (table) => {
      table.increments('id').primary()
      table
        .integer('product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('products')
        .onDelete('CASCADE')
      table.integer('qty_received').notNullable().checkPositive()
      table.integer('qty_remaining').notNullable()
      table.float('unit_cost').notNullable().checkPositive()
      table.timestamp('created_at').defaultTo(db.fn.now())

      table.check('?? >= 0 AND ?? <= ??', ['qty_remaining', 'qty_remaining', 'qty_received'])
    })

    await db.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_lots_fifo
      ON inventory_lots(product_id, id ASC)
      WHERE qty_remaining > 0
    `)
  }

  if (!(await db.schema.hasTable('sales'))) {
    await db.schema.createTable('sales', (table) => {
      table.increments('id').primary()
      table.float('total_amount').notNullable().checkPositive()
      table.timestamp('created_at').defaultTo(db.fn.now())
    })
  }

  if (!(await db.schema.hasTable('sale_items'))) {
    await db.schema.createTable('sale_items', (table) => {
      table.increments('id').primary()
      table
        .integer('sale_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sales')
        .onDelete('CASCADE')
      table
        .integer('product_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('products')
        .onDelete('RESTRICT')
      table
        .integer('lot_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('inventory_lots')
        .onDelete('RESTRICT')
      table.integer('quantity').notNullable().checkPositive()
      table.float('unit_price').notNullable().checkPositive()

      table.specificType(
        'total_price',
        'REAL GENERATED ALWAYS AS (quantity * unit_price) STORED'
      )
    })

    await db.schema.raw(`
      CREATE TRIGGER IF NOT EXISTS trg_deduct_lot_stock
      AFTER INSERT ON sale_items
      BEGIN
        UPDATE inventory_lots
        SET qty_remaining = qty_remaining - NEW.quantity
        WHERE id = NEW.lot_id;
      END;
    `)
  }
}
