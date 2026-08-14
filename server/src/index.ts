import { serve } from '@hono/node-server'
import { app, injectWebSocket } from './app'
import { env } from './config/env'
import { startCronJobs } from './cron/jobs'

const server = serve({
  port: env.PORT,
  fetch: app.fetch,
})

injectWebSocket(server)

startCronJobs()

console.log(`LUNA API ready at http://localhost:${env.PORT}`)
