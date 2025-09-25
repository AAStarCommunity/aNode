/**
 * Type definitions for aNode Simple Paymaster
 */

export interface UserOperation {
  sender: string
  nonce: string
  initCode: string
  callData: string
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  paymasterAndData: string
  signature: string
}

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
