import Database  from 'better-sqlite3'
import path from 'path'

const dbPath = path.resolve(process.cwd(), '/src')
const db = new Database(path.join(dbPath, 'inventory.db'))

const initQuery = `
  CREATE TABLE IF NOT EXISTS products
`
db.exec(initQuery)

export default db
