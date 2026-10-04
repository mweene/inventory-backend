import { Router } from 'express'
import * as controllers  from '../controllers/controllers.js'

const router:Router = Router()

router.get('/', controllers.root)
router.get('/api/products', controllers.getProducts)

export default router
