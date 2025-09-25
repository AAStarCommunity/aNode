import type { Env, PaymasterResponse, UserOperation } from './types'

/**
 * aNode Paymaster Core
 * Phase 1: Simple paymaster implementation
 * Compatible with future direct-payment expansion
 */
export class aNodePaymaster {
  constructor(private env: Env) {}

  async processUserOperation(userOp: UserOperation): Promise<PaymasterResponse> {
    const paymentMethod = this.detectPaymentMethod(userOp)

    if (paymentMethod === 'direct-payment') {
      // Direct payment mode (e.g., ZeroDev Ultra-Relay style)
      // Bundler will pay gas directly, no paymasterAndData needed from us
      return {
        success: true,
        userOperation: {
          ...userOp,
          maxFeePerGas: '0x0',
          maxPriorityFeePerGas: '0x0',
          paymasterAndData: '0x', // No paymaster needed
        },
        paymentMethod: 'direct-payment',
      }
    }
    // Traditional paymaster mode
    const paymasterAndData = await this.generatePaymasterAndData(userOp)

    return {
      success: true,
      userOperation: {
        ...userOp,
        paymasterAndData,
      },
      paymentMethod: 'paymaster',
    }
  }

  /**
   * Detect payment method
   * Phase 1: Simple logic, can be extended in Phase 2
   */
  private detectPaymentMethod(userOp: UserOperation): 'direct-payment' | 'paymaster' {
    // For Phase 1, if maxFeePerGas and maxPriorityFeePerGas are 0, assume direct-payment
    // Otherwise, assume traditional paymaster
    if (userOp.maxFeePerGas === '0x0' && userOp.maxPriorityFeePerGas === '0x0') {
      return 'direct-payment'
    }
    return 'paymaster'
  }

  /**
   * Generates a placeholder paymasterAndData for Phase 1.
   * In Phase 2, this will involve actual signing and more complex logic.
   */
  private async generatePaymasterAndData(_userOp: UserOperation): Promise<string> {
    // In Phase 1, we return a placeholder.
    // In Phase 2, this will involve:
    // 1. Fetching real paymaster address from config/env
    // 2. Calculating userOpHash using the EntryPoint
    // 3. Signing the hash with the paymaster's private key
    // 4. Encoding paymaster data (verificationGasLimit, postOpGasLimit, paymasterData, signature)

    // Get EntryPoint address based on version (default to v0.6)
    const entryPointVersion = this.env.ENTRYPOINT_VERSION || '0.6'
    const _entryPointAddress =
      entryPointVersion === '0.7'
        ? this.env.ENTRYPOINT_V07_ADDRESS || '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
        : this.env.ENTRYPOINT_V06_ADDRESS || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

    // Placeholder values for Phase 1
    const paymasterAddress =
      this.env.PAYMASTER_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890'
    const verificationGasLimit = '0x186a0' // 100k gas
    const postOpGasLimit = '0xc350' // 50k gas
    const paymasterData = '0x' // Empty for Phase 1
    const signature = `0x${'00'.repeat(65)}` // Placeholder 65-byte signature

    return (
      paymasterAddress +
      verificationGasLimit.slice(2) +
      postOpGasLimit.slice(2) +
      paymasterData.slice(2) +
      signature.slice(2)
    )
  }

  /**
   * Cache management (Phase 1: Basic KV operations)
   */
  private async getCachedResult<T = unknown>(key: string): Promise<T | null> {
    try {
      const cached = await this.env.CACHE_KV.get(key)
      return cached ? (JSON.parse(cached) as T) : null
    } catch (error) {
      console.warn('Cache read error:', error)
      return null
    }
  }

  private async setCachedResult(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.env.CACHE_KV.put(key, JSON.stringify(value), {
        expirationTtl: ttlSeconds,
      })
    } catch (error) {
      console.warn('Cache write error:', error)
    }
  }
}
