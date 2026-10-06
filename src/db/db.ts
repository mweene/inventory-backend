import knex from 'knex'

export interface Product {
  id?: number
  sku: string
  name: string
  category: string
  price: number
}

declare module 'knex/types/tables.js' {
  interface Tables {
    products: Product
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
}
