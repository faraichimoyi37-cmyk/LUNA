import { app, websocket } from './app'
import { env } from './config/env'
import { startCronJobs } from './cron/jobs'

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  websocket,
})

startCronJobs()

console.log(`LUNA API ready at http://localhost:${server.port}`)
