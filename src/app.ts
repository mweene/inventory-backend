import express from "express"
import path from 'path'
import { fileURLToPath } from 'url'
import router from './routes/routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


export default function buildApp():express.Application {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/public', express.static(path.join(__dirname, 'public')))
  app.use(router)

  return app
}

