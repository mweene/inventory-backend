import { Router } from 'express'
import * as controllers  from '../controllers/controllers.js'

const router:Router = Router()

router.get('/', controllers.root)
router.get('/api/products', controllers.getProducts)
router.get('/api/products/:sku', controllers.getProductBySku)
router.post('/api/products', controllers.createProduct)
router.post('/api/productWithStock', controllers.createProductWithStock)

export default router
