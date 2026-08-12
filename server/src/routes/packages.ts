import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { prisma } from '../config/prisma'
import { ApiError, ok } from '../utils/http'

const packages = new Hono<AppEnv>()

packages.get('/', async (c) => {
  const list = await prisma.package.findMany({
    where: { status: true },
    orderBy: { investmentAmount: 'asc' },
  })
  return ok(c, list)
})

packages.get('/:id', async (c) => {
  const pkg = await prisma.package.findFirst({ where: { id: c.req.param('id'), status: true } })
  if (!pkg) throw new ApiError(404, 'Package not found')
  return ok(c, pkg)
})

export default packages
