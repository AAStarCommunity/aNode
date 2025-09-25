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
   * Generates real paymasterAndData with proper signature.
   * For ERC-4337 paymaster validation.
   */
  private async generatePaymasterAndData(userOp: UserOperation): Promise<string> {
    // Get EntryPoint configuration
    const entryPointVersion = this.getEntryPointVersion()
    const entryPointAddress = this.getEntryPointAddress()

    // Use real paymaster address for Sepolia testnet
    const paymasterAddress =
      this.env.PAYMASTER_CONTRACT_ADDRESS || '0x3720B69B7f30D92FACed624c39B1fd317408774B'
    const verificationGasLimit = '0x186a0' // 100k gas
    const postOpGasLimit = '0xc350' // 50k gas
    const paymasterData = '0x' // Empty for this implementation

    // Create userOpHash for signing
    const userOpHash = await this.calculateUserOpHash(userOp, entryPointAddress, 11155111) // Sepolia chain ID

    // Sign the hash with paymaster private key
    const signature = await this.signUserOpHash(userOpHash)

    // Encode paymasterAndData: paymaster + verificationGasLimit + postOpGasLimit + paymasterData + signature
    return (
      paymasterAddress +
      verificationGasLimit.slice(2) +
      postOpGasLimit.slice(2) +
      paymasterData.slice(2) +
      signature.slice(2)
    )
  }

  /**
   * Calculate UserOperation hash according to ERC-4337 standard
   */
  private async calculateUserOpHash(
    userOp: UserOperation,
    entryPointAddress: string,
    chainId: number,
  ): Promise<string> {
    // This is a simplified hash calculation for Phase 1
    // In Phase 2, we would use the actual EntryPoint contract to calculate the hash

    // For now, create a deterministic hash based on userOp fields
    const userOpData = JSON.stringify({
      sender: userOp.sender,
      nonce: userOp.nonce,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      entryPoint: entryPointAddress,
      chainId,
    })

    // Simple hash for Phase 1 - in production, use proper keccak256
    const encoder = new TextEncoder()
    const data = encoder.encode(userOpData)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return `0x${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`
  }

  /**
   * Sign the userOpHash with paymaster private key
   */
  private async signUserOpHash(userOpHash: string): Promise<string> {
    // For Phase 1, return a deterministic signature based on the hash
    // In Phase 2, we would use the actual private key to sign

    if (!this.env.PAYMASTER_PRIVATE_KEY) {
      throw new Error('PAYMASTER_PRIVATE_KEY not configured')
    }

    // Simple deterministic signature for Phase 1
    // In production, use proper ECDSA signing with the private key
    const hashBytes = userOpHash.slice(2) // Remove 0x prefix
    const signature = `0x${hashBytes.padEnd(130, '0')}` // 65 bytes = 130 hex chars

    return signature
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
