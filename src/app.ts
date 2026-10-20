import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import path from 'path'
import router from './routes/router.js'

export default function buildApp():express.Application {
  const app = express()

  app.use(cors())
  app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/public', express.static(path.join(process.cwd(), 'public')))
  app.use(router)

  return app
}

