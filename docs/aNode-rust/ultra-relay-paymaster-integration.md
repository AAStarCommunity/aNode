# Ultra-Relay 中的 Paymaster 集成分析

## 概述

本文档分析 ZeroDev Ultra-Relay 如何将 paymaster 能力集成到 bundler 中，为 aNode 的 paymaster 开发提供参考。

## Ultra-Relay 架构特点

### 核心定位

**Ultra-Relay** 是基于 Pimlico Alto 的修改版本，专注于"无 paymaster 赞助"的 relayer 功能，但仍保留完整的 paymaster 处理能力。

### 关键修改 (2025 年 1 月 22 日)

1. **零 Gas 费支持**: 接受 `maxFeePerGas` 和 `maxPriorityFeePerGas` 为 0 的 UserOperation
2. **Relayer 直接支付**: Bundler 使用自己在 EntryPoint 的预存余额支付 gas
3. **兼容性保持**: 仍支持传统的 paymaster 工作流

### Gas 支付机制澄清

app/ultra-relay
Answer

你的理解基本正确。在 Ultra-Relay 中，最终提交上链的确实是 executor 账户，而 paymaster 等机制主要负责 gas 费用的结算和支付。

Executor 账户的上链角色
Executor 账户作为 EOA，负责最终的交易提交：executor.ts:125-133

在 sendHandleOpsTransaction 方法中，可以看到交易请求的构建过程，其中 from 和 account 都设置为 executor 账户，这意味着 executor 账户是实际签名并提交交易的主体。

Gas 费用结算机制
关于 gas 费用的结算，Ultra-Relay 中涉及多个层面：

实际 gas 支付：Executor 账户直接支付网络 gas 费用 executorManager.ts:199-207
Gas 费用计算：系统会计算每个 UserOperation 的实际 gas 成本，包括 L1 和 L2 费用 executorManager.ts:358-372
Paymaster 预存款扣除：如果使用 paymaster，系统会检查并扣除 paymaster 的预存款 mempool.ts:566-601
费用结算的详细流程
在 mempool 的 bundling 过程中，系统会验证 paymaster 是否有足够的预存款来支付 UserOperation：mempool.ts:578-587

对于 UserOperation 的 gas 费用计算，系统使用 getRequiredPrefund 函数来计算所需的预付款：userop.ts:687-710

利润分配机制
虽然代码中没有明确显示利润分配的具体实现，但从配置选项可以看出系统支持 "no-profit-bundling" 模式：options.ts:347-352

这表明系统确实考虑了 bundler 的利润问题，可以配置是否将所有受益人费用都用于支付 gas 费用。

Notes

Ultra-Relay 的费用结算机制确实如你所说，executor 账户负责最终上链，而 paymaster 等机制负责实际的 gas 费用结算。系统通过预存款机制和实时 gas 价格计算来确保费用的正确分配，同时支持 bundler 利润的配置管理。

Wiki pages you might want to explore:

System Architecture (zerodevapp/ultra-relay)

## Paymaster 处理流程

### 1. UserOperation 接收和验证

```typescript
// Ultra-Relay 接受的 UserOperation 格式
interface UserOperation {
  sender: Address
  nonce: Hex
  initCode: Hex
  callData: Hex
  callGasLimit: Hex
  verificationGasLimit: Hex
  preVerificationGas: Hex
  maxFeePerGas: Hex        // 可以为 0x0
  maxPriorityFeePerGas: Hex // 可以为 0x0
  paymasterAndData: Hex    // Paymaster 数据
  signature: Hex
}
```

---
Answer

你说得完全正确。Ultra-Relay 本身不需要维护一个完整的以太坊客户端，它只是一个处理和提交交易的中间层服务。

Ultra-Relay 的客户端依赖
Ultra-Relay 通过配置的 RPC URL 连接到外部的以太坊节点，而不是运行自己的节点：options.ts:482-487

在初始化过程中，系统创建 publicClient 和 walletClient 来与外部以太坊网络交互：handler.ts:116-127

核心功能定位
Ultra-Relay 的主要职责是：

接收和验证 UserOperations：通过 RPC 接口接收用户操作 eth_sendUserOperation.ts:5-16
打包和提交交易：将 UserOperations 打包成 handleOps 交易提交给 EntryPoint 合约 executor.ts:357-368
Gas 估算和模拟：使用 EntryPoint 模拟合约进行 gas 估算 gasEstimationsV07.ts:820-837
与以太坊网络的交互方式
Ultra-Relay 通过标准的 JSON-RPC 调用与以太坊网络交互，包括：

eth_call 用于模拟和验证
eth_sendTransaction 用于提交交易
eth_getTransactionCount 用于获取 nonce
这些调用都通过配置的 RPC 端点发送到外部的以太坊节点，而不需要本地维护区块链状态。

Notes

Ultra-Relay 是一个轻量级的 bundler 服务，专注于 ERC-4337 UserOperation 的处理和提交。它依赖外部的以太坊节点来获取区块链状态和提交交易，这种架构使得部署和维护更加简单。

### 2. Paymaster 验证集成

**双重处理模式**:

#### 模式 A: 传统 Paymaster
```typescript
if (userOp.paymasterAndData !== "0x") {
  // 调用外部 paymaster 验证
  const paymasterResult = await validateWithPaymaster(userOp)
  // 使用 paymaster 返回的 gas 数据
}
```

#### 模式 B: Relayer 直接赞助
```typescript
if (userOp.maxFeePerGas === 0n && userOp.maxPriorityFeePerGas === 0n) {
  // Relayer 直接支付 gas
  // 跳过 paymaster 验证
  // 使用 bundler 的资金支付
}
```

### 3. Gas 估算和费用计算

**费用计算逻辑**:

```typescript
// 1. 基础 gas 估算
const baseGasEstimate = await estimateUserOperationGas(userOp)

// 2. Paymaster 费用调整
let finalGasEstimate = baseGasEstimate
if (hasPaymaster) {
  finalGasEstimate = await adjustForPaymaster(baseGasEstimate, paymasterData)
}

// 3. Relayer 费用覆盖
if (isRelayerSponsored) {
  finalGasEstimate = await applyRelayerSponsorship(finalGasEstimate)
}
```

## 核心实现组件

### Executor 模块

**位置**: `src/executor/`

#### 主要职责
- 执行 UserOperation 批次
- 管理 gas 价格和费用
- 处理 paymaster 集成
- 协调 bundler 和 relayer 逻辑

#### 关键文件分析

**executor.ts**:
```typescript
// 处理包含 paymaster 的 UserOperation
async function executeWithPaymaster(userOp: UserOperation) {
  // 1. 验证 paymaster 数据
  // 2. 调用 paymaster.validatePaymasterUserOp
  // 3. 调整 gas 估算
  // 4. 执行交易
  // 5. 调用 paymaster.postOp
}
```

**filterOpsAndEstimateGas.ts**:
```typescript
// 过滤和估算包含 paymaster 的操作
export async function filterOpsAndEstimateGas(params) {
  const { userOpBundle } = params

  for (const userOp of userOpBundle.userOps) {
    if (userOp.paymasterAndData !== "0x") {
      // Paymaster 存在，执行验证
      await validatePaymasterData(userOp)
    } else if (isZeroGasPrice(userOp)) {
      // Relayer 赞助模式
      await validateRelayerSponsorship(userOp)
    }
  }
}
```

### Gas 价格管理

**位置**: `src/handlers/gasPriceManager.ts`

#### Paymaster 相关的 gas 处理

```typescript
class GasPriceManager {
  // 处理 paymaster 修改的 gas 价格
  async adjustGasForPaymaster(
    baseGasPrice: bigint,
    paymasterData: Hex
  ): Promise<GasPriceAdjustment> {
    // 解析 paymaster 返回的 gas 数据
    // 调整最终 gas 价格
    // 返回调整后的参数
  }
}
```

## 与传统 Bundler 的区别

### Alto (Pimlico) - 纯 Bundler

```
用户 → Alto Bundler → 验证 UserOp → 发送到 EntryPoint
                      ↓
               调用外部 Paymaster (如果需要)
```

### Ultra-Relay (ZeroDev) - Bundler + Paymaster

```
用户 → Ultra-Relay → 验证 UserOp → 选择处理模式
                      ↓
           ┌─────────────────┴─────────────────┐
           │                                   │
    调用外部 Paymaster                 Relayer 直接赞助
    (传统模式)                          (新模式)
```

## aNode 实现指导

### 1. 双模式支持

```typescript
type SponsorshipMode =
  | { type: "paymaster", address: Address }  // 外部 paymaster
  | { type: "relayer", account: Account }    // 直接赞助

class PaymasterHandler {
  async processUserOperation(
    userOp: UserOperation,
    mode: SponsorshipMode
  ) {
    switch (mode.type) {
      case "paymaster":
        return await handleExternalPaymaster(userOp, mode.address)
      case "relayer":
        return await handleRelayerSponsorship(userOp, mode.account)
    }
  }
}
```

### 2. 零 Gas 价格处理

```typescript
function isRelayerSponsored(userOp: UserOperation): boolean {
  return userOp.maxFeePerGas === 0n && userOp.maxPriorityFeePerGas === 0n
}

async function handleZeroGasPrice(userOp: UserOperation) {
  // 1. 验证用户权限 (SBT, PNT 等)
  // 2. 计算实际 gas 费用
  // 3. 从 relayer 账户支付
  // 4. 记录赞助详情
}
```

### 3. Paymaster 验证流程

```typescript
async function validatePaymasterIntegration(userOp: UserOperation) {
  if (!userOp.paymasterAndData || userOp.paymasterAndData === "0x") {
    // 无 paymaster，直接处理
    return await processWithoutPaymaster(userOp)
  }

  // 有 paymaster，执行完整验证流程
  const paymasterAddress = extractPaymasterAddress(userOp.paymasterAndData)

  // 1. 验证 paymaster 合约存在
  // 2. 调用 validatePaymasterUserOp
  // 3. 处理验证结果
  // 4. 更新 gas 估算

  return await processWithPaymaster(userOp, paymasterAddress)
}
```

## 技术架构优势

### 1. 灵活的赞助模式

- **外部 Paymaster**: 传统 ERC-4337 模式，支持复杂的业务逻辑
- **Relayer 直接赞助**: 简化流程，降低 gas 成本
- **混合模式**: 根据用户需求动态选择

### 2. 渐进式迁移

Ultra-Relay 的设计允许：
- 从纯 paymaster 模式开始
- 逐步引入 relayer 赞助功能
- 平滑过渡到混合模式

### 3. 成本优化

- **零 Gas 价格**: 用户无需支付 gas，提升 UX
- **批量处理**: 多个操作共享 bundler 开销
- **智能路由**: 根据 gas 价格选择最优路径

## 去中心化赞助机制设计

### 核心思路分析

你的想法非常有洞察力！如果 bundler 直接提供赞助服务，那么传统 paymaster 的角色就可以被大大简化。以下是去中心化赞助机制的完整设计：

#### 1. 准入条件验证
```typescript
interface SponsorshipEligibility {
  hasRequiredNFT: boolean      // 拥有特定 NFT (如 SBT)
  hasMinimumERC20Balance: boolean  // ERC20 余额充足
  maxFeePerGas: 0n            // 零 gas 价格标记
  maxPriorityFeePerGas: 0n    // 零 gas 价格标记
}
```

#### 2. 链下验证逻辑
```typescript
class DecentralizedSponsorshipValidator {
  async validateSponsorshipEligibility(userOp: UserOperation): Promise<boolean> {
    // 1. 验证 NFT 持有 (链下缓存)
    const hasNFT = await this.checkNFTOwnership(userOp.sender)

    // 2. 验证 ERC20 余额 (链下缓存)
    const hasBalance = await this.checkERC20Balance(userOp.sender)

    // 3. 验证 gas 价格为 0
    const isZeroGas = userOp.maxFeePerGas === 0n && userOp.maxPriorityFeePerGas === 0n

    return hasNFT && hasBalance && isZeroGas
  }
}
```

#### 3. 异步池化结算系统
```solidity
contract SponsorshipSettlementPool {
    struct SponsorshipRecord {
        address user;
        uint256 gasAmount;
        uint256 blockNumber;
        bytes32 userOpHash;
    }

    // 池化记录
    mapping(address => SponsorshipRecord[]) public userRecords;

    // 批量结算
    function batchSettle(address[] calldata users, uint256[] calldata amounts) external {
        // 1. 验证调用者权限
        // 2. 批量扣除 ERC20
        // 3. 分配收益给 bundler
        // 4. 清理记录
    }

    // 紧急暂停
    function emergencyPause() external onlyOwner {
        // 暂停所有结算
    }
}
```

### 优势分析

#### 1. 去中心化优势
- **无中心化依赖**: 不依赖特定 paymaster 合约
- **透明结算**: 所有赞助记录上链可查
- **社区治理**: 可通过 DAO 治理结算规则

#### 2. 用户体验提升
- **零 Gas 费用**: 用户无需准备 gas token
- **即时可用**: 无需等待 paymaster 确认
- **批量结算**: 减少交易次数和 gas 成本

#### 3. 经济模型优化
- **降低门槛**: NFT + ERC20 双重验证，安全性高
- **激励机制**: Bundler 通过提供服务获得收益
- **可持续性**: 通过 ERC20 代币结算，形成闭环经济

## 实现建议

### Phase 1: 基础 Paymaster 支持
- 实现传统的 paymaster.validatePaymasterUserOp
- 支持外部 paymaster 合约
- 完成基本的 gas 赞助流程

### Phase 2: 去中心化赞助扩展
- 实现 NFT + ERC20 验证机制
- 添加零 gas 价格支持和 bundler 直接支付
- 部署 SponsorshipSettlementPool 合约

### Phase 3: 高级功能
- 实现异步池化结算系统
- 添加批量操作优化
- 构建社区治理机制

## 结论

Ultra-Relay 的 paymaster 集成展示了现代 bundler 的发展趋势：

1. **统一处理**: Bundler 和 paymaster 的紧密集成
2. **灵活赞助**: 支持多种 gas 支付模式
3. **用户体验**: 零 gas 费用的无缝体验
4. **扩展性**: 为复杂业务逻辑留出空间

这种设计为 aNode 的 paymaster 开发提供了优秀的参考架构，既保持了 ERC-4337 的标准兼容性，又提供了创新的用户体验优化。

---

*基于 ZeroDev Ultra-Relay 实现分析*
*参考 Pimlico Alto 原始架构*
