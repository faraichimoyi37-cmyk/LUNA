import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createBunWebSocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'
import type { AppEnv } from './types'
import { env } from './config/env'
import { prisma } from './config/prisma'
import { errorHandler } from './middleware/error'
import { rateLimit } from './middleware/rateLimit'
import { csrfProtection } from './middleware/csrf'
import { fail } from './utils/http'
import { verifyToken } from './utils/jwt'
import { addConnection, removeConnection, type WsClient } from './ws/hub'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import packagesRoutes from './routes/packages'
import investmentsRoutes from './routes/investments'
import depositsRoutes from './routes/deposits'
import withdrawalsRoutes from './routes/withdrawals'
import transactionsRoutes from './routes/transactions'
import notificationsRoutes from './routes/notifications'
import kycRoutes from './routes/kyc'
import supportRoutes from './routes/support'
import configRoutes from './routes/config'
import adminRoutes from './routes/admin'
import luckyRoutes from './routes/lucky'
import spinRoutes from './routes/spin'
import agentsRoutes from './routes/agents'

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()

const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN.split(','),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  }),
)
app.use('*', csrfProtection)
app.use('/api/*', rateLimit({ max: 600 }))
app.use('/api/auth/*', rateLimit({ max: 30 }))

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'luna-api', time: new Date().toISOString() }),
)

app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/packages', packagesRoutes)
app.route('/api/investments', investmentsRoutes)
app.route('/api/deposits', depositsRoutes)
app.route('/api/withdrawals', withdrawalsRoutes)
app.route('/api/transactions', transactionsRoutes)
app.route('/api/notifications', notificationsRoutes)
app.route('/api/kyc', kycRoutes)
app.route('/api/support', supportRoutes)
app.route('/api/config', configRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/lucky', luckyRoutes)
app.route('/api/spin', spinRoutes)
app.route('/api/agents', agentsRoutes)

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    const token = new URL(c.req.url).searchParams.get('token')
    return {
      async onOpen(_event, ws) {
        if (!token) {
          ws.close()
          return
        }
        const payload = await verifyToken(token)
        if (!payload) {
          ws.close()
          return
        }
        const user = await prisma.user.findUnique({ where: { id: payload.userId } })
        if (!user || user.status === 'SUSPENDED') {
          ws.close()
          return
        }
        addConnection(user.id, ws as unknown as WsClient)
        ws.send(JSON.stringify({ type: 'connected', data: { userId: user.id } }))
      },
      onMessage(_event, ws) {
        ws.send(JSON.stringify({ type: 'pong' }))
      },
      onClose(_event, ws) {
        removeConnection(ws as unknown as WsClient)
      },
    }
  }),
)

app.notFound((c) => fail(c, 404, 'Route not found'))
app.onError(errorHandler)

export { app, websocket }
