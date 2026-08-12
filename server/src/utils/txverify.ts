import { createHash } from 'node:crypto'

export type Chain = 'TRON' | 'ETH' | 'BSC'

export interface VerifyResult {
  verified: boolean
  reason?: string
  source?: string
  block?: string
  confirmations?: number
  to?: string
  amount?: number
  token?: string
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const TRON_TX = /^[0-9a-fA-F]{64}$/
const EVM_TX = /^0x[0-9a-fA-F]{64}$/

export function detectChain(method: string): Chain {
  if (method === 'USDT_TRC20') return 'TRON'
  if (method === 'USDT_ERC20') return 'ETH'
  return 'BSC'
}

export function validateTxFormat(chain: Chain, txRef: string): { valid: boolean; error?: string } {
  const ref = txRef.trim()
  if (chain === 'TRON') {
    if (!TRON_TX.test(ref)) return { valid: false, error: 'Invalid TRC20 transaction ID. Must be exactly 64 hex characters (e.g. a1b2c3...).' }
  } else {
    if (!EVM_TX.test(ref)) return { valid: false, error: 'Invalid transaction hash. Must be 0x followed by 64 hex characters.' }
  }
  return { valid: true }
}

// ---------------------------------------------------------------- base58 / tron

function base58Decode(input: string): Buffer | null {
  const bytes: number[] = []
  for (const ch of input) {
    const digit = BASE58.indexOf(ch)
    if (digit === -1) return null
    let carry = digit
    for (let i = 0; i < bytes.length; i++) {
      const x = bytes[i] * 58 + carry
      bytes[i] = x & 0xff
      carry = x >> 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  let zeros = 0
  for (const ch of input) {
    if (ch === '1') zeros++
    else break
  }
  const buf = Buffer.alloc(bytes.length + zeros)
  for (let i = 0; i < zeros; i++) buf[i] = 0
  for (let i = 0; i < bytes.length; i++) buf[zeros + bytes.length - 1 - i] = bytes[i]
  return buf
}

export function isValidTronAddress(address: string): boolean {
  const buf = base58Decode(address)
  if (!buf || buf.length !== 25 || buf[0] !== 0x41) return false
  const hash = createHash('sha256').update(createHash('sha256').update(buf.subarray(0, 21)).digest()).digest()
  return buf.subarray(21).equals(hash.subarray(0, 4))
}

export function hexToBase58(hex: string): string {
  let num = BigInt(`0x${hex}`)
  let out = ''
  while (num > 0n) {
    out = BASE58[Number(num % 58n)] + out
    num /= 58n
  }
  let zeros = 0
  while (zeros + 2 <= hex.length && hex.slice(zeros, zeros + 2) === '00') zeros += 2
  return '1'.repeat(zeros / 2) + out
}

export function tronAddressFromPayload(payloadHex20: string): string {
  const head = Buffer.from(`41${payloadHex20}`, 'hex')
  const hash = createHash('sha256').update(createHash('sha256').update(head).digest()).digest()
  const full = Buffer.concat([head, hash.subarray(0, 4)])
  return hexToBase58(full.toString('hex'))
}

// ---------------------------------------------------------------- keccak-256 (EIP-55)

const KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]
const ROT = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
]
const MASK = (1n << 64n) - 1n
const RATE = 136

function rotl(x: bigint, n: number): bigint {
  return ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK
}

function keccakF(state: bigint[]) {
  const bc = new Array<bigint>(5)
  for (let round = 0; round < 24; round++) {
    for (let i = 0; i < 5; i++) bc[i] = state[i] ^ state[i + 5] ^ state[i + 10] ^ state[i + 15] ^ state[i + 20]
    for (let i = 0; i < 5; i++) {
      const t = bc[(i + 4) % 5] ^ rotl(bc[(i + 1) % 5], 1)
      for (let j = 0; j < 25; j += 5) state[j + i] ^= t
    }
    const temp = [...state]
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(temp[x + 5 * y], ROT[x][y])
      }
    }
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) bc[x] = state[y + x]
      for (let x = 0; x < 5; x++) state[y + x] = bc[x] ^ (~bc[(x + 1) % 5] & bc[(x + 2) % 5])
    }
    state[0] ^= KECCAK_RC[round]
  }
}

export function keccak256Hex(input: string): string {
  const data = new TextEncoder().encode(input)
  const state = new Array<bigint>(25).fill(0n)
  const padded = new Uint8Array(data.length + (data.length % RATE === RATE - 1 ? RATE + 1 : RATE - (data.length % RATE)))
  padded.set(data)
  padded[data.length] = 0x01
  padded[padded.length - 1] = 0x80

  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE; i += 8) {
      let lane = 0n
      for (let b = 0; b < 8; b++) lane |= BigInt(padded[off + i + b]) << BigInt(8 * b)
      state[i / 8] ^= lane
    }
    keccakF(state)
  }

  const out = new Uint8Array(32)
  for (let i = 0; i < 4; i++) {
    let lane = state[i]
    for (let b = 0; b < 8; b++) {
      out[i * 8 + b] = Number(lane & 0xffn)
      lane >>= 8n
    }
  }
  return Buffer.from(out).toString('hex')
}

export function isValidEthAddress(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false
  const body = address.slice(2)
  const lower = body.toLowerCase()
  if (body === lower) return true
  if (body === lower.toUpperCase()) return true
  const hash = keccak256Hex(lower)
  let expected = ''
  for (let i = 0; i < 40; i++) {
    expected += Number.parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i]
  }
  return expected === body
}

export function validateWalletAddress(network: string, address: string): { valid: boolean; error?: string } {
  const addr = address.trim()
  if (network === 'TRC20') {
    if (!isValidTronAddress(addr)) {
      return { valid: false, error: 'Invalid TRC20 address. Must be a valid 34-character Tron address (T...).' }
    }
  } else if (network === 'ERC20' || network === 'BEP20') {
    if (!isValidEthAddress(addr)) {
      return { valid: false, error: `Invalid ${network} address. Must be 0x followed by 40 hex characters.` }
    }
  }
  return { valid: true }
}

// ---------------------------------------------------------------- on-chain checks

const TRON_USDT_PAYLOAD = 'a614f803b6fd780986a42c78ec9c7f77e6ded13c'
const ETH_USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const BSC_USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955'
const EVM_RPCS: Record<'ETH' | 'BSC', string[]> = {
  ETH: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com'],
  BSC: ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.binance.org'],
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; json: any }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    // empty or non-JSON body
  }
  return { status: res.status, json }
}

function parseErc20Transfer(data: string): { to: string; amount: bigint } | null {
  const hex = data.startsWith('0x') ? data.slice(2) : data
  if (!hex.startsWith('a9059cbb')) return null
  const to = `0x${hex.slice(8 + 24, 8 + 64)}`
  const amount = BigInt(`0x${hex.slice(8 + 64, 8 + 128)}`)
  return { to, amount }
}

async function verifyTron(txHash: string, expectedTo: string, expectedAmount: number): Promise<VerifyResult> {
  const { json } = await fetchJson('https://api.trongrid.io/wallet/gettransactionbyid', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: txHash }),
  })
  const tx = json?.ret ? json : null
  if (!tx) return { verified: false, reason: 'Transaction not found on the TRON blockchain. Check the hash or send the transfer first.' }

  const contractRet = tx.ret?.[0]?.contractRet
  if (contractRet && contractRet !== 'SUCCESS') {
    return { verified: false, reason: `Transaction was not successful on-chain (${contractRet}).` }
  }

  const contract = tx.raw_data?.contract?.[0]
  const value = contract?.parameter?.value
  if (!value?.data || !value?.contract_address) {
    return { verified: false, reason: 'Transaction is not a token transfer.' }
  }
  const contractPayload = value.contract_address.toLowerCase().slice(-40)
  if (contractPayload !== TRON_USDT_PAYLOAD) {
    return { verified: false, reason: 'Transaction does not involve the USDT (TRC20) token.' }
  }

  const transfer = parseErc20Transfer(value.data.toLowerCase())
  if (!transfer) return { verified: false, reason: 'Transaction is not a USDT transfer.' }

  const to = tronAddressFromPayload(transfer.to.slice(2).toLowerCase())
  if (to !== expectedTo) {
    return { verified: false, reason: `Transaction recipient (${to}) does not match your deposit address.` }
  }

  const amount = Number(transfer.amount / 1_000_000n)
  if (amount !== expectedAmount) {
    return { verified: false, reason: `On-chain amount (${amount} USDT) does not match the requested $${expectedAmount}.` }
  }

  return {
    verified: true,
    source: 'TRONGRID',
    to,
    amount,
    token: 'USDT (TRC20)',
  }
}

async function verifyEvm(chain: 'ETH' | 'BSC', txHash: string, expectedTo: string, expectedAmount: number): Promise<VerifyResult> {
  let tx: any = null
  for (const rpc of EVM_RPCS[chain]) {
    const { json } = await fetchJson(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionByHash', params: [txHash], id: 1 }),
    })
    if (json?.result) {
      tx = json.result
      break
    }
  }
  if (!tx) return { verified: false, reason: 'Transaction not found on the blockchain. Check the hash or send the transfer first.' }
  if (!tx.blockNumber) return { verified: false, reason: 'Transaction is not confirmed on-chain yet. Wait for a few confirmations.' }

  const tokenContract = chain === 'BSC' ? BSC_USDT_CONTRACT : ETH_USDT_CONTRACT
  if (String(tx.to ?? '').toLowerCase() !== tokenContract) {
    return { verified: false, reason: 'Transaction is not sent to the USDT token contract.' }
  }

  const input = String(tx.input ?? '0x').toLowerCase()
  const transfer = parseErc20Transfer(input)
  if (!transfer) return { verified: false, reason: 'Transaction is not a USDT (ERC-20) transfer.' }

  if (transfer.to.toLowerCase() !== expectedTo.toLowerCase()) {
    return { verified: false, reason: `Transaction recipient (${transfer.to}) does not match your deposit address.` }
  }

  const amount = Number(transfer.amount / 1_000_000n)
  if (amount !== expectedAmount) {
    return { verified: false, reason: `On-chain amount (${amount} USDT) does not match the requested $${expectedAmount}.` }
  }

  return {
    verified: true,
    source: chain === 'BSC' ? 'BSC-RPC' : 'ETH-RPC',
    block: String(tx.blockNumber),
    to: transfer.to,
    amount,
    token: 'USDT',
  }
}

export async function verifyTransaction(input: {
  chain: Chain
  txHash: string
  expectedTo: string
  expectedAmount: number
}): Promise<VerifyResult> {
  const { chain, txHash, expectedTo, expectedAmount } = input
  if (chain === 'TRON') return verifyTron(txHash, expectedTo, expectedAmount)
  return verifyEvm(chain, txHash, expectedTo, expectedAmount)
}
