import { ApiError } from '../utils/http'
import { getSettings } from './settings'
import { detectChain, validateTxFormat, verifyTransaction } from '../utils/txverify'

export type DepositMethod = 'USDT_TRC20' | 'USDT_ERC20' | 'USDT_BEP20'

export async function verifyPayment(input: {
  amount: number
  method: DepositMethod
  txRef: string
}): Promise<Record<string, unknown>> {
  const settings = await getSettings()
  if (input.amount < Number(settings.minDeposit)) {
    throw new ApiError(400, `Minimum deposit is $${settings.minDeposit}`)
  }

  const chain = detectChain(input.method)
  const format = validateTxFormat(chain, input.txRef)
  if (!format.valid) throw new ApiError(400, format.error ?? 'Invalid transaction ID format')

  if (settings.txVerificationEnabled !== false) {
    const expectedTo =
      chain === 'TRON' ? settings.depositWalletTrc20 : chain === 'BSC' ? settings.depositWalletBep20 : settings.depositWalletErc20
    try {
      const result = await verifyTransaction({ chain, txHash: input.txRef, expectedTo, expectedAmount: input.amount })
      if (!result.verified) {
        throw new ApiError(400, `Transaction could not be verified: ${result.reason}`)
      }
      return { ...result }
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(503, 'Unable to reach the blockchain to verify this transaction. Try again in a few minutes.')
    }
  }
  return { verified: true, source: 'MANUAL', note: 'On-chain verification is disabled' }
}
