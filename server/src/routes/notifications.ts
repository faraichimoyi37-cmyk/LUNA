import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ok } from '../utils/http'
import { requireAuth } from '../middleware/auth'

const notifications = new Hono<AppEnv>()

notifications.use('*', requireAuth)

notifications.get('/', async (c) => {
  const user = c.get('user')
  const list = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  return ok(c, list)
})

notifications.get('/unread-count', async (c) => {
  const user = c.get('user')
  const count = await prisma.notification.count({ where: { userId: user.id, read: false } })
  return ok(c, { count })
})

notifications.patch('/read-all', async (c) => {
  const user = c.get('user')
  const { count } = await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })
  return ok(c, { updated: count })
})

notifications.patch('/:id/read', async (c) => {
  const user = c.get('user')
  await prisma.notification.updateMany({ where: { id: c.req.param('id'), userId: user.id }, data: { read: true } })
  return ok(c, { updated: true })
})

export default notifications
