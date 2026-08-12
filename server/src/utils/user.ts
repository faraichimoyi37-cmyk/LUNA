import type { User } from '@prisma/client'

export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password: _password, ...rest } = user
  return rest
}
