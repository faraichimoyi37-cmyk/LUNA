import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env'

const secret = new TextEncoder().encode(env.JWT_SECRET)

function expiresInSeconds(exp: string): number {
  const unit = exp.slice(-1)
  const value = Number.parseInt(exp, 10)
  if (Number.isNaN(value) || value <= 0) return 7 * 24 * 60 * 60
  if (unit === 'h') return value * 60 * 60
  if (unit === 'm') return value * 60
  if (unit === 'd') return value * 24 * 60 * 60
  return value
}

export type JwtPayload = {
  userId: string
  role: string
  tokenVersion?: number
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('luna')
    .setAudience('luna-users')
    .setExpirationTime(new Date(Date.now() + expiresInSeconds(env.JWT_EXPIRES_IN) * 1000))
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: 'luna', audience: 'luna-users' })
    return {
      userId: String(payload.userId),
      role: String(payload.role),
      tokenVersion: typeof payload.tokenVersion === 'number' ? payload.tokenVersion : undefined,
    }
  } catch {
    return null
  }
}
