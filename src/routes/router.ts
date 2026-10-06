import { Router } from 'express'
import * as controllers  from '../controllers/controllers.js'

const router:Router = Router()

router.get('/', controllers.root)
router.get('/api/products', controllers.getProducts)
router.post('/api/products', controllers.createProduct)

export default router
