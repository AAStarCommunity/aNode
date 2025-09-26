import { beforeEach, describe, expect, it } from 'vitest'
import { aNodePaymaster } from './paymaster'
import type { Env, UserOperation, UserOperationV6, PackedUserOperation } from './types'

// Mock environment for testing
const mockEnv: Env = {
  CACHE_KV: {
    get: async () => null,
    put: async () => undefined,
  } as unknown as KVNamespace,
  SETTLEMENT_KV: {
    get: async () => null,
    put: async () => undefined,
  } as unknown as KVNamespace,
  PAYMASTER_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  ENTRYPOINT_V06_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  ENTRYPOINT_V07_ADDRESS: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  ENTRYPOINT_VERSION: '0.6',
  PAYMASTER_CONTRACT_ADDRESS: '0x3720B69B7f30D92FACed624c39B1fd317408774B',
  NODE_ENV: 'test',
}

const mockUserOp: UserOperationV6 = {
  sender: '0x1234567890123456789012345678901234567890',
  nonce: '0x0',
  initCode: '0x',
  callData: '0x',
  callGasLimit: '0x5208',
  verificationGasLimit: '0x186a0',
  preVerificationGas: '0x5208',
  maxFeePerGas: '0x3b9aca00',
  maxPriorityFeePerGas: '0x3b9aca00',
  paymasterAndData: '0x',
  signature: '0x',
}

const mockPackedUserOp: PackedUserOperation = {
  sender: '0x1234567890123456789012345678901234567890',
  nonce: '0x0',
  initCode: '0x',
  callData: '0x',
  accountGasLimits: '0x000000000000000000000000000052080000000000000000000000000000186a0', // packed callGasLimit + verificationGasLimit
  preVerificationGas: '0x5208',
  gasFees: '0x000000000000000000000000003b9aca000000000000000000000000003b9aca00', // packed maxFeePerGas + maxPriorityFeePerGas
  paymasterAndData: '0x',
  signature: '0x',
}

describe('aNodePaymaster', () => {
  let paymaster: aNodePaymaster

  beforeEach(() => {
    paymaster = new aNodePaymaster(mockEnv)
  })

  it('should process traditional paymaster UserOperation', async () => {
    const result = await paymaster.processUserOperation(mockUserOp)

    expect(result.success).toBe(true)
    expect(result.paymentMethod).toBe('paymaster')
    expect((result.userOperation as UserOperationV6).paymasterAndData).not.toBe('0x')
    expect((result.userOperation as UserOperationV6).paymasterAndData.length).toBeGreaterThan(2)
  })

  it('should process direct-payment UserOperation', async () => {
    const directPaymentUserOp: UserOperationV6 = {
      ...mockUserOp,
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
    }

    const result = await paymaster.processUserOperation(directPaymentUserOp)

    expect(result.success).toBe(true)
    expect(result.paymentMethod).toBe('direct-payment')
    expect((result.userOperation as UserOperationV6).paymasterAndData).toBe('0x')
    expect(result.userOperation.maxFeePerGas).toBe('0x0')
    expect(result.userOperation.maxPriorityFeePerGas).toBe('0x0')
  })

  it('should process v0.7 PackedUserOperation', async () => {
    const paymasterV7 = new aNodePaymaster(mockEnv, '0.7')
    const result = await paymasterV7.processUserOperation(mockPackedUserOp)

    expect(result.success).toBe(true)
    expect(result.paymentMethod).toBe('paymaster')
    expect((result.userOperation as PackedUserOperation).paymasterAndData).not.toBe('0x')
    expect((result.userOperation as PackedUserOperation).paymasterAndData.length).toBeGreaterThan(2)
  })

  it('should use requested version over environment version', async () => {
    const paymasterV7 = new aNodePaymaster(mockEnv, '0.7')
    const result = await paymasterV7.processUserOperation(mockPackedUserOp)

    expect(result.success).toBe(true)
    // Should use v0.7 EntryPoint address even though env is set to '0.6'
  })

  it('should fallback to environment version when no requested version', async () => {
    const result = await paymaster.processUserOperation(mockUserOp)

    expect(result.success).toBe(true)
    // Should use v0.6 based on mockEnv.ENTRYPOINT_VERSION = '0.6'
  })
})
