import { hash, verify, type Options } from '@node-rs/argon2'

const HASH_OPTIONS: Options = {
  algorithm: 2, // Argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS)
}

export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  return verify(hashValue, password)
}
