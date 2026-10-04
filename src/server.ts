import buildApp from './app.js'
import dotenv from 'dotenv'

dotenv.config()

const app = buildApp()
const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`server is listening on port: http://localhost:${port}`)
})
