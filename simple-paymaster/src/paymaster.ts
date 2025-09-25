import type {
  ENTRYPOINT_VERSIONS,
  Env,
  PaymasterResponse,
  UserOperation,
  UserOperationV6,
  UserOperationV7,
} from './types'

/**
 * aNode Paymaster Core
 * Phase 1: Simple paymaster implementation
 * Compatible with future direct-payment expansion
 */
export class aNodePaymaster {
  constructor(private env: Env) {}

  async processUserOperation(userOp: UserOperation): Promise<PaymasterResponse> {
    // Validate UserOperation format
    if (!this.validateUserOperation(userOp)) {
      return {
        success: false,
        userOperation: userOp,
        paymentMethod: 'paymaster',
        error: {
          code: 'INVALID_USER_OPERATION',
          message: 'Invalid UserOperation format for the configured EntryPoint version',
        },
      }
    }

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

  private getEntryPointVersion(): '0.6' | '0.7' {
    const version = this.env.ENTRYPOINT_VERSION || '0.6'
    return version === '0.7' ? '0.7' : '0.6'
  }

  private getEntryPointAddress(): string {
    const version = this.getEntryPointVersion()
    return version === '0.7'
      ? this.env.ENTRYPOINT_V07_ADDRESS || ENTRYPOINT_VERSIONS['0.7'].address
      : this.env.ENTRYPOINT_V06_ADDRESS || ENTRYPOINT_VERSIONS['0.6'].address
  }

  private isUserOperationV7(userOp: UserOperation): userOp is UserOperationV7 {
    return 'paymaster' in userOp || 'factory' in userOp
  }

  private validateUserOperation(userOp: UserOperation): boolean {
    const version = this.getEntryPointVersion()

    if (version === '0.7') {
      // v0.7 validation - allow both v0.6 and v0.7 formats
      return !!(userOp.sender && userOp.nonce && userOp.callData && userOp.signature)
    }
    // v0.6 validation - require v0.6 format
    const v6UserOp = userOp as UserOperationV6
    return !!(
      v6UserOp.sender &&
      v6UserOp.nonce &&
      v6UserOp.initCode !== undefined &&
      v6UserOp.callData &&
      v6UserOp.paymasterAndData !== undefined &&
      v6UserOp.signature
    )
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

    // Get EntryPoint address and version
    const entryPointVersion = this.getEntryPointVersion()
    const _entryPointAddress = this.getEntryPointAddress()

    // Use real paymaster address for Sepolia testnet
    const paymasterAddress =
      this.env.PAYMASTER_CONTRACT_ADDRESS || '0x3720B69B7f30D92FACed624c39B1fd317408774B'
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
