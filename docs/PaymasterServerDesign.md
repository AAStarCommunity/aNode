# Paymaster Server Design

## Overview

Based on reverse engineering the permissionless.js library and tutorial examples, a paymaster server is a JSON-RPC service that enables ERC-4337 smart accounts to pay for transaction fees using alternative methods (sponsorship or ERC-20 tokens) instead of native cryptocurrency.

## Core Interfaces

### 1. pm_sponsorUserOperation

**Purpose**: Request sponsorship for a user operation

**Parameters**:
- `userOperation`: Partial UserOperation object (missing gas limits)
- `entryPoint`: EntryPoint contract address (0.6, 0.7, or 0.8)
- `metadata`: Optional sponsorship policy configuration

**Returns** (EntryPoint v0.7+):
```json
{
  "paymaster": "0x...",
  "paymasterData": "0x...",
  "paymasterVerificationGasLimit": "0x...",
  "paymasterPostOpGasLimit": "0x...",
  "preVerificationGas": "0x...",
  "verificationGasLimit": "0x...",
  "callGasLimit": "0x..."
}
```

**Returns** (EntryPoint v0.6):
```json
{
  "paymasterAndData": "0x...",
  "preVerificationGas": "0x...",
  "verificationGasLimit": "0x...",
  "callGasLimit": "0x..."
}
```

### 2. pm_getPaymasterStubData

**Purpose**: Get preliminary paymaster data for gas estimation

**Parameters**:
- `userOperation`: UserOperation object
- `entryPoint`: EntryPoint contract address
- `chainId`: Chain identifier
- `context`: Paymaster-specific context (token address for ERC-20 mode)

**Returns**:
```json
{
  "paymaster": "0x...",
  "paymasterData": "0x...",
  "paymasterVerificationGasLimit": "0x...",
  "paymasterPostOpGasLimit": "0x...",
  "sponsor": {
    "name": "string",
    "icon": "url"
  },
  "isFinal": false
}
```

### 3. pm_getPaymasterData

**Purpose**: Get final paymaster data with signature

**Parameters**:
- `userOperation`: UserOperation object
- `entryPoint`: EntryPoint contract address
- `chainId`: Chain identifier
- `context`: Paymaster-specific context

**Returns**:
```json
{
  "paymaster": "0x...",
  "paymasterData": "0x...",
  "paymasterVerificationGasLimit": "0x...",
  "paymasterPostOpGasLimit": "0x..."
}
```

### 4. pm_validateSponsorshipPolicies

**Purpose**: Validate available sponsorship policies

**Parameters**:
- `userOperation`: UserOperation object
- `entryPoint`: EntryPoint contract address
- `sponsorshipPolicyIds`: Array of policy IDs to validate

**Returns**:
```json
[{
  "sponsorshipPolicyId": "policy_id",
  "data": {
    "name": "Policy Name",
    "author": "Author",
    "icon": "icon_url",
    "description": "Policy description"
  }
}]
```

### 5. pimlico_getTokenQuotes

**Purpose**: Get exchange rates for ERC-20 token payments

**Parameters**:
- `tokens`: Object with array of token addresses
- `entryPoint`: EntryPoint contract address
- `chainId`: Chain identifier in hex

**Returns**:
```json
{
  "quotes": [{
    "paymaster": "0x...",
    "token": "0x...",
    "postOpGas": "0x...",
    "exchangeRate": "0x...",
    "exchangeRateNativeToUsd": "0x...",
    "balanceSlot": "0x...",
    "allowanceSlot": "0x..."
  }]
}
```

## Paymaster Modes

### 1. Verifying Mode (Sponsorship)
- Paymaster covers the full transaction cost
- Requires signature validation
- Optional sponsorship policies and limits

### 2. ERC-20 Mode (Token Payment)
- User pays with ERC-20 tokens
- Requires token approval and conversion
- Paymaster facilitates token-to-native conversion

## Workflow States

1. **User Operation Creation**: Smart account prepares UserOperation
2. **Gas Estimation**: Client requests gas estimates from bundler
3. **Paymaster Selection**: Choose between sponsorship or token payment
4. **Stub Data Request**: Get preliminary paymaster data for estimation
5. **Final Data Request**: Get signed paymaster data for execution
6. **Bundling**: Bundler includes UserOperation in batch
7. **Validation**: Paymaster contract validates during execution
8. **Post-Operation**: Paymaster executes postOp (token transfer/payment)

## Product Design Considerations

### Security Features
- Signature validation for sponsored operations
- Token allowance management
- Gas limit enforcement
- Sponsorship policy validation

### Scalability Features
- Multi-EntryPoint support (v0.6, v0.7, v0.8)
- Batch processing capabilities
- Rate limiting and abuse prevention

### Developer Experience
- Clear error messages
- Comprehensive logging
- Health check endpoints
- Documentation and examples

### Business Logic
- Sponsorship policy management
- Token exchange rate management
- Fee calculation and collection
- Analytics and monitoring
