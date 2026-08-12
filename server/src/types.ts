import type { User } from '@prisma/client'

export interface AppEnv {
  Variables: {
    user: User
    validated: unknown
  }
}

export type { User }
