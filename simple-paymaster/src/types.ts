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

// EntryPoint v0.7 PackedUserOperation structure
export interface PackedUserOperation {
  sender: Address
  nonce: Hex
  initCode: Hex
  callData: Hex
  accountGasLimits: Hex // callGasLimit + verificationGasLimit (packed)
  preVerificationGas: Hex
  gasFees: Hex // maxFeePerGas + maxPriorityFeePerGas (packed)
  paymasterAndData: Hex
  signature: Hex
}

// Type alias for backwards compatibility
export type UserOperationV7 = PackedUserOperation

// Union type for UserOperation (backwards compatibility)
export type UserOperation = UserOperationV6 | UserOperationV7

// Helper functions for version detection and conversion
export function isUserOperationV6(userOp: UserOperation): userOp is UserOperationV6 {
  return 'callGasLimit' in userOp && 'verificationGasLimit' in userOp &&
         'maxFeePerGas' in userOp && 'maxPriorityFeePerGas' in userOp
}

export function isUserOperationV7(userOp: UserOperation): userOp is PackedUserOperation {
  return 'accountGasLimits' in userOp && 'gasFees' in userOp
}

// Convert v0.6 to v0.7 format
export function convertV6ToV7(v6Op: UserOperationV6): PackedUserOperation {
  // Pack callGasLimit and verificationGasLimit into accountGasLimits
  const callGasLimit = BigInt(v6Op.callGasLimit)
  const verificationGasLimit = BigInt(v6Op.verificationGasLimit)
  const accountGasLimits = `0x${(callGasLimit << 128n | verificationGasLimit).toString(16).padStart(64, '0')}` as Hex

  // Pack maxFeePerGas and maxPriorityFeePerGas into gasFees
  const maxFeePerGas = BigInt(v6Op.maxFeePerGas)
  const maxPriorityFeePerGas = BigInt(v6Op.maxPriorityFeePerGas)
  const gasFees = `0x${(maxFeePerGas << 128n | maxPriorityFeePerGas).toString(16).padStart(64, '0')}` as Hex

  return {
    sender: v6Op.sender,
    nonce: v6Op.nonce,
    initCode: v6Op.initCode,
    callData: v6Op.callData,
    accountGasLimits,
    preVerificationGas: v6Op.preVerificationGas,
    gasFees,
    paymasterAndData: v6Op.paymasterAndData,
    signature: v6Op.signature
  }
}

// Convert v0.7 to v0.6 format
export function convertV7ToV6(v7Op: PackedUserOperation): UserOperationV6 {
  // Unpack accountGasLimits
  const accountGasLimits = BigInt(v7Op.accountGasLimits)
  const callGasLimit = `0x${(accountGasLimits >> 128n).toString(16).padStart(64, '0')}` as Hex
  const verificationGasLimit = `0x${(accountGasLimits & ((1n << 128n) - 1n)).toString(16).padStart(64, '0')}` as Hex

  // Unpack gasFees
  const gasFees = BigInt(v7Op.gasFees)
  const maxFeePerGas = `0x${(gasFees >> 128n).toString(16).padStart(64, '0')}` as Hex
  const maxPriorityFeePerGas = `0x${(gasFees & ((1n << 128n) - 1n)).toString(16).padStart(64, '0')}` as Hex

  return {
    sender: v7Op.sender,
    nonce: v7Op.nonce,
    initCode: v7Op.initCode,
    callData: v7Op.callData,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas: v7Op.preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData: v7Op.paymasterAndData,
    signature: v7Op.signature
  }
}

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
  entryPointVersion?: '0.6' | '0.7' // Optional: defaults to env setting or '0.6'
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
