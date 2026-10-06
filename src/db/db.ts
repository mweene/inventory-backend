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

declare module 'knex/types/tables.js' {
  interface Tables {
    products: Product,
    inventory_lots: InventoryLot
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
      // Configure Pragmas on connection setup
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

      // Check constraints
      table.check('?? >= 0 AND ?? <= ??', ['qty_remaining', 'qty_remaining', 'qty_received'])
    })

    // Partial Index for high-speed FIFO lookup
    await db.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_lots_fifo
      ON inventory_lots(product_id, id ASC)
      WHERE qty_remaining > 0
    `)
  }



}
