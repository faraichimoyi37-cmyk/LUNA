import { prisma } from '../config/prisma'
import { ApiError } from '../utils/http'

export interface PromoResult {
  promoId: string
  code: string
  percent: number
}

export async function validatePromoCode(code: string, userId?: string): Promise<PromoResult> {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } })
  if (!promo) throw new ApiError(404, 'Invalid promo code')
  if (!promo.status) throw new ApiError(400, 'This promo code is no longer active')
  if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) throw new ApiError(400, 'This promo code has expired')
  if (promo.usedCount >= promo.maxUses) throw new ApiError(400, 'This promo code has reached its usage limit')
  if (userId) {
    const used = await prisma.promoUsage.findUnique({ where: { promoId_userId: { promoId: promo.id, userId } } })
    if (used) throw new ApiError(400, 'You have already used this promo code')
  }
  return { promoId: promo.id, code: promo.code, percent: promo.percent }
}

export async function consumePromoCode(promoId: string) {
  await prisma.promoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } })
}

export async function recordPromoUsage(promoId: string, userId: string) {
  await prisma.promoUsage.create({ data: { promoId, userId } })
}
