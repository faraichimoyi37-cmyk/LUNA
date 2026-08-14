import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createNodeWebSocket } from '@hono/node-ws'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
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

const app = new Hono<AppEnv>()

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app })

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

// --------------------------------------------------------------- seo
function requestOrigin(c: { req: { header: (name: string) => string | undefined } }): string {
  const host = c.req.header('Host') ?? 'localhost:3000'
  const proto = c.req.header('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

app.get('/robots.txt', (c) => {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /ws',
    'Disallow: /dashboard',
    'Disallow: /admin',
    '',
    `Sitemap: ${requestOrigin(c)}/sitemap.xml`,
    '',
  ].join('\n')
  return c.text(body)
})

app.get('/sitemap.xml', (c) => {
  const origin = requestOrigin(c)
  const pages = ['/', '/login', '/register']
  const urls = pages
    .map(
      (p) =>
        `  <url><loc>${origin}${p}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.7'}</priority></url>`,
    )
    .join('\n')
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

// --------------------------------------------------------------- static web
const webDist = join(import.meta.dirname, '../../web/dist')
const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}

app.get('*', (c) => {
  const url = c.req.path
  if (url.startsWith('/api') || url.startsWith('/ws')) return c.notFound()
  let filePath = normalize(join(webDist, url === '/' ? 'index.html' : url))
  if (!filePath.startsWith(webDist)) return c.notFound()
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(webDist, 'index.html')
  const body = readFileSync(filePath)
  c.header('Content-Type', mimeTypes[extname(filePath)] ?? 'application/octet-stream')
  c.header('Cache-Control', filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable')
  return c.body(body)
})

export { app, injectWebSocket }
