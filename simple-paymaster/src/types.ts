/**
 * Type definitions for aNode Simple Paymaster
 */

// Address and Hex types
export type Address = `0x${string}`
export type Hex = `0x${string}`

// EntryPoint v0.6 UserOperation structure
export interface UserOperationV6 {
  sender: Address
  nonce: Hex
  initCode: Hex
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxPriorityFeePerGas: Hex
  maxFeePerGas: Hex
  paymasterAndData: Hex
  signature: Hex
}

// EntryPoint v0.7 UserOperation structure
export interface UserOperationV7 {
  sender: Address
  nonce: Hex
  factory?: Address
  factoryData?: Hex
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
  paymaster?: Address
  paymasterVerificationGasLimit?: Hex
  paymasterPostOpGasLimit?: Hex
  paymasterData?: Hex
  signature: Hex
}

// Union type for UserOperation (backwards compatibility)
export type UserOperation = UserOperationV6 | UserOperationV7

// EntryPoint configuration
export interface EntryPointConfig {
  address: Address
  version: '0.6' | '0.7'
}

export const ENTRYPOINT_VERSIONS = {
  '0.6': {
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
    version: '0.6' as const,
  },
  '0.7': {
    address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as Address,
    version: '0.7' as const,
  },
} as const

export interface PaymasterResponse {
  success: boolean
  userOperation: UserOperation
  paymentMethod: 'direct-payment' | 'paymaster'
  error?: {
    code: string
    message: string
  }
}

export interface Env {
  // KV Namespaces
  CACHE_KV: KVNamespace
  SETTLEMENT_KV: KVNamespace

  // Secrets (managed by wrangler secret)
  PAYMASTER_PRIVATE_KEY: string
  ETHEREUM_RPC_URL?: string
  SEPOLIA_RPC_URL?: string

  // Environment variables
  NODE_ENV?: string
  LOG_LEVEL?: string
  ENTRYPOINT_V06_ADDRESS?: string
  ENTRYPOINT_V07_ADDRESS?: string
  ENTRYPOINT_VERSION?: string
  PAYMASTER_CONTRACT_ADDRESS?: string
  DEBUG?: string
  ENABLE_METRICS?: string
}

export interface ProcessRequest {
  userOperation: UserOperation
}

export interface ProcessResponse {
  success: boolean
  userOperation: UserOperation
  paymentMethod: 'direct-payment' | 'paymaster'
  processing: {
    modules: string[]
    totalDuration: string
    service: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface ProcessedUserOp {
  success: boolean
  userOperation: UserOperation
  paymentMethod: 'direct-payment' | 'paymaster'
}
