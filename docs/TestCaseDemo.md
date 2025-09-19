# aPaymaster Test Case Demo

## Overview

This test case demonstrates a complete ERC-4337 UserOperation flow using the aPaymaster server design. The flow includes:

1. Creating a simple UserOperation
2. Submitting to aPaymaster for sponsorship/gas payment
3. Receiving signed paymaster data
4. Submitting to external bundler for execution

## Test Scenario: Simple ETH Transfer

**Objective**: Transfer 0.001 ETH from a Safe smart account to a recipient address using aPaymaster sponsorship.

### Prerequisites

```typescript
// Test setup based on tutorials and permissionless.js patterns
import { createSmartAccountClient } from "permissionless"
import { toSafeSmartAccount } from "permissionless/accounts"
import { createPimlicoClient } from "permissionless/clients/pimlico"
import { createPublicClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import { entryPoint07Address } from "viem/account-abstraction"

// Test configuration
const TEST_PRIVATE_KEY = "0x1234567890123456789012345678901234567890123456789012345678901234"
const PAYMASTER_RPC_URL = "https://aPaymaster.example.com/rpc"
const BUNDLER_RPC_URL = "https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_API_KEY"
const RECIPIENT_ADDRESS = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
```

### Step 1: Setup Clients

```typescript
// Initialize public client
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http("https://rpc.ankr.com/eth_sepolia")
})

// Initialize aPaymaster client (our custom paymaster)
const paymasterClient = createPimlicoClient({
    transport: http(PAYMASTER_RPC_URL),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7"
    }
})

// Initialize external bundler client
const bundlerClient = createPimlicoClient({
    transport: http(BUNDLER_RPC_URL),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7"
    }
})
```

### Step 2: Create Smart Account

```typescript
// Create owner account
const owner = privateKeyToAccount(TEST_PRIVATE_KEY)

// Create Safe smart account (following tutorial-1.ts pattern)
const smartAccount = await toSafeSmartAccount({
    client: publicClient,
    owner: owner,
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7"
    },
    version: "1.4.1"
})

console.log(`Smart Account Address: ${smartAccount.address}`)
```

### Step 3: Create Smart Account Client with aPaymaster

```typescript
// Create smart account client configured with aPaymaster
const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain: sepolia,
    bundlerTransport: http(BUNDLER_RPC_URL),
    paymaster: paymasterClient, // Use our aPaymaster
    userOperation: {
        estimateFeesPerGas: async () => {
            return (await bundlerClient.getUserOperationGasPrice()).fast
        }
    }
})
```

### Step 4: Create Simple UserOperation

```typescript
// Create a simple ETH transfer UserOperation
// Following tutorial-1.ts pattern but with minimal complexity
const userOp = await smartAccountClient.prepareUserOperation({
    calls: [{
        to: RECIPIENT_ADDRESS,
        value: parseEther("0.001"), // 0.001 ETH
        data: "0x" // Simple transfer, no additional data
    }]
})

console.log("Prepared UserOperation:", {
    sender: userOp.sender,
    nonce: userOp.nonce,
    callData: userOp.callData,
    maxFeePerGas: userOp.maxFeePerGas,
    maxPriorityFeePerGas: userOp.maxPriorityFeePerGas
})
```

### Step 5: Submit to aPaymaster for Sponsorship

```typescript
// Request sponsorship from aPaymaster
// This calls pm_sponsorUserOperation on our paymaster server
const sponsoredUserOp = await paymasterClient.sponsorUserOperation({
    userOperation: {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: userOp.initCode,
        callData: userOp.callData,
        // Gas limits will be estimated by paymaster
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        preVerificationGas: 1n, // Dummy value, paymaster will estimate
        verificationGasLimit: 1n, // Dummy value, paymaster will estimate
        callGasLimit: 1n, // Dummy value, paymaster will estimate
        paymasterVerificationGasLimit: 1n, // Dummy value, paymaster will estimate
        paymasterPostOpGasLimit: 1n // Dummy value, paymaster will estimate
    },
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7"
    },
    sponsorshipPolicyId: "free_test_policy" // Optional: specify sponsorship policy
})

console.log("Sponsored UserOperation:", {
    paymaster: sponsoredUserOp.paymaster,
    paymasterData: sponsoredUserOp.paymasterData,
    paymasterVerificationGasLimit: sponsoredUserOp.paymasterVerificationGasLimit,
    paymasterPostOpGasLimit: sponsoredUserOp.paymasterPostOpGasLimit,
    preVerificationGas: sponsoredUserOp.preVerificationGas,
    verificationGasLimit: sponsoredUserOp.verificationGasLimit,
    callGasLimit: sponsoredUserOp.callGasLimit
})
```

### Step 6: Complete UserOperation with Paymaster Data

```typescript
// Combine original UserOperation with paymaster data
const completeUserOp = {
    ...userOp,
    ...sponsoredUserOp
}

console.log("Complete UserOperation ready for bundling:", completeUserOp)
```

### Step 7: Submit to External Bundler

```typescript
// Submit the complete UserOperation to external bundler
const userOpHash = await bundlerClient.sendUserOperation({
    ...completeUserOp
})

console.log(`UserOperation submitted to bundler: ${userOpHash}`)

// Wait for inclusion in a bundle
const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash
})

console.log("UserOperation executed successfully!")
console.log(`Transaction hash: ${receipt.receipt.transactionHash}`)
console.log(`Block number: ${receipt.receipt.blockNumber}`)
```

## Expected aPaymaster Server Logs

When the UserOperation is submitted to aPaymaster, the server should:

1. **Receive pm_sponsorUserOperation request**
   ```
   Received sponsorship request for UserOperation:
   - Sender: 0x[smart_account_address]
   - CallData: 0x[transfer_calldata]
   - EntryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
   ```

2. **Validate sponsorship policy**
   ```
   Checking sponsorship policy: free_test_policy
   Policy validation: PASSED
   ```

3. **Estimate gas limits**
   ```
   Gas estimation:
   - preVerificationGas: 45000
   - verificationGasLimit: 120000
   - callGasLimit: 65000
   - paymasterVerificationGasLimit: 50000
   - paymasterPostOpGasLimit: 100000
   ```

4. **Generate paymaster data and signature**
   ```
   Generated paymaster data:
   - paymaster: 0x[paymaster_contract_address]
   - paymasterData: 0x[signed_paymaster_data]
   ```

5. **Return sponsored UserOperation**
   ```json
   {
     "paymaster": "0x...",
     "paymasterData": "0x...",
     "preVerificationGas": "0xafc8",
     "verificationGasLimit": "0x1d4c0",
     "callGasLimit": "0xfe28",
     "paymasterVerificationGasLimit": "0xc350",
     "paymasterPostOpGasLimit": "0x186a0"
   }
   ```

## Alternative Test Case: ERC-20 Token Payment

For testing ERC-20 payment mode (following tutorial-2.ts pattern):

```typescript
// Use ERC-20 token for payment instead of sponsorship
const smartAccountClientERC20 = createSmartAccountClient({
    account: smartAccount,
    chain: sepolia,
    bundlerTransport: http(BUNDLER_RPC_URL),
    paymaster: paymasterClient,
    userOperation: {
        estimateFeesPerGas: async () => {
            return (await bundlerClient.getUserOperationGasPrice()).fast
        }
    }
})

// Get token quotes first
const tokenQuotes = await paymasterClient.getTokenQuotes({
    tokens: ["0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"], // USDC on Sepolia
    entryPointAddress: entryPoint07Address
})

// Submit with token payment context
const userOpHashERC20 = await smartAccountClientERC20.sendTransaction({
    to: RECIPIENT_ADDRESS,
    value: parseEther("0.001"),
    paymasterContext: {
        token: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // USDC
    }
})
```

## Mock aPaymaster Server Implementation

For testing purposes, here's how aPaymaster could be implemented:

```typescript
// Mock aPaymaster server (inspired by mock-paymaster)
const aPaymasterServer = {
    pm_sponsorUserOperation: (params) => {
        // Validate sponsorship policy
        // Estimate gas costs
        // Generate signature
        // Return paymaster data
        return {
            paymaster: PAYMASTER_CONTRACT_ADDRESS,
            paymasterData: generateSignature(params),
            preVerificationGas: "0xafc8",
            verificationGasLimit: "0x1d4c0",
            callGasLimit: "0xfe28",
            paymasterVerificationGasLimit: "0xc350",
            paymasterPostOpGasLimit: "0x186a0"
        }
    },

    pimlico_getTokenQuotes: (params) => {
        // Return token exchange rates
        return {
            quotes: [{
                paymaster: PAYMASTER_CONTRACT_ADDRESS,
                token: params.tokens[0],
                postOpGas: "0xc350",
                exchangeRate: "0x5cc717fbb3450c", // Mock exchange rate
                exchangeRateNativeToUsd: "0x5cc717fbb3450c0000"
            }]
        }
    }
}
```

## Success Criteria

The test case succeeds when:

1. ✅ Smart account is created successfully
2. ✅ UserOperation is prepared without errors
3. ✅ aPaymaster accepts sponsorship request
4. ✅ Paymaster data is returned with proper gas estimates
5. ✅ Bundler accepts the UserOperation
6. ✅ Transaction is included in a bundle and executed on-chain
7. ✅ Recipient receives the transferred ETH
8. ✅ Paymaster contract validates the operation correctly

## Error Scenarios to Test

1. **Insufficient sponsorship balance**: Paymaster rejects due to low balance
2. **Invalid sponsorship policy**: Policy doesn't exist or is expired
3. **Gas estimation failure**: Bundler cannot estimate gas costs
4. **Invalid signature**: Paymaster signature verification fails
5. **Token balance issues**: ERC-20 mode with insufficient token balance
