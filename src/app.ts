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

  const publicPath = path.join(process.cwd(), 'src', 'public')
  app.use(express.static(publicPath))

  app.use(router)

  // SPA fallback for client-side routing
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(publicPath, 'index.html'))
  })

  return app
}
