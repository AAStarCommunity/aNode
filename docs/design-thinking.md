# Paymaster 设计思考：从 ZeroDev 学习到 aNode 实现

## 引言

本文档分析了 ZeroDev SDK、examples 和文档中的 paymaster 设计模式，通过反向推导确定 paymaster 应用应该暴露的服务接口、数据结构、错误定义和内部逻辑。

## ZeroDev Paymaster 架构分析

### 1. 服务接口设计

#### 核心 RPC 方法

从 `vendor/permissionless.js/packages/mock-paymaster/relay.ts` 分析，ZeroDev paymaster 支持以下核心方法：

**确定性接口（已标准化）：**
- `pm_sponsorUserOperation` - 用户操作赞助（核心功能）
- `pm_getPaymasterData` - 获取 paymaster 数据
- `pm_getPaymasterStubData` - 获取 paymaster 存根数据
- `pm_validateSponsorshipPolicies` - 验证赞助策略

**推测性接口（可能扩展）：**
- `pimlico_getUserOperationGasPrice` - 获取 gas 价格
- `pimlico_getTokenQuotes` - 获取代币报价

#### HTTP 接口模式

从 ZeroDev SDK 分析，客户端通过以下模式调用：
```typescript
const paymasterClient = createZeroDevPaymasterClient({
  chain,
  transport: http(`https://rpc.zerodev.app/api/v2/paymaster/${projectId}`)
})
```

### 2. 数据结构分析

#### UserOperation 数据结构

**确定性结构（符合 ERC-4337）：**

```typescript
// EntryPoint v0.6
interface UserOperationV6 {
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

// EntryPoint v0.7
interface UserOperationV7 {
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
```

#### Paymaster 响应结构

**确定性响应（从 permissionless.js 分析）：**

```typescript
interface PaymasterResponse {
  preVerificationGas: Hex
  callGasLimit: Hex
  paymasterVerificationGasLimit?: Hex
  paymasterPostOpGasLimit?: Hex
  verificationGasLimit: Hex
  paymasterAndData: Hex  // 核心：包含 paymaster 地址和签名
}
```

#### 策略配置结构

**推测性结构（从 gas-policies 文档推导）：**

```typescript
interface SponsorshipPolicy {
  sponsorshipPolicyId: string
  data: {
    name: string
    author: string
    icon: string
    description: string
  }
}

interface PaymasterContext {
  token?: Address        // ERC20 支付模式
  sponsorshipPolicyId?: string  // 赞助策略 ID
  validForSeconds?: number     // 有效期
  meta?: Record<string, string> // 元数据
}
```

### 3. 错误定义分析

#### 标准错误码

**确定性错误（符合 EIP-1474）：**

```typescript
enum ValidationErrors {
  InvalidFields = -32602,        // 字段验证错误
  InsufficientBalance = -32603,  // 余额不足
  UnsupportedEntryPoint = -32604 // 不支持的 EntryPoint
}
```

#### 错误响应结构

**确定性结构（JSON-RPC 2.0）：**

```typescript
interface JsonRpcError {
  jsonrpc: "2.0"
  id: number
  error: {
    code: number
    message: string
    data?: any
  }
}
```

### 4. 内部逻辑分析

#### Paymaster 处理流程

**确定性流程（从 relay.ts 分析）：**

```
1. 验证 EntryPoint 版本
2. 获取对应的 paymaster 合约地址
3. 估算 gas（可选）
4. 生成 paymaster 签名
5. 返回 paymasterAndData
```

#### Paymaster 模式

**确定性模式（从代码分析）：**

```typescript
type PaymasterMode =
  | { mode: "verifying" }        // 验证模式：paymaster 验证用户操作
  | { mode: "erc20", token: Address } // ERC20 模式：用户用代币支付 gas
```

#### 签名生成逻辑

**推测性逻辑（从 singletonPaymasters.ts 推导）：**

```typescript
function getSignedPaymasterData(params: {
  signer: WalletClient
  userOp: UserOperation
  paymaster: Address
  paymasterMode: PaymasterMode
  publicClient: PublicClient
}) {
  // 1. 构造 paymaster 数据
  // 2. 计算用户操作哈希
  // 3. 签名哈希
  // 4. 返回 paymasterAndData
}
```

### 5. Gas 估算策略

#### ERC20 Gas 估算

**确定性策略（从 estimate-gas.ts 分析）：**

```typescript
interface ERC20GasEstimate {
  exchangeRateNativeToUsd: Hex
  exchangeRate: Hex           // 代币到原生代币的汇率
  balanceSlot: Hex           // 余额存储槽
  allowanceSlot: Hex         // 授权存储槽
  postOpGas: Hex            // 后操作 gas
}
```

#### 估算流程

**推测性流程：**
```
1. 获取代币价格信息
2. 计算所需 gas 量
3. 转换为代币数量
4. 验证用户余额和授权
5. 返回估算结果
```

### 6. aNode Paymaster 设计推导

#### 核心服务接口

基于 ZeroDev 分析，aNode paymaster 应该暴露：

**RESTful API：**
- `GET /health` - 健康检查
- `POST /api/v1/paymaster/sponsor` - Gas 赞助
- `POST /api/v1/paymaster/process` - 完整处理

**JSON-RPC 2.0 API：**
- `pm_sponsorUserOperation`
- `pm_getPaymasterData`
- `pm_getPaymasterStubData`

#### 数据结构定义

```typescript
// aNode 增强的 UserOperation
interface ANodeUserOperation extends UserOperation {
  // ERC-4337 标准字段
  // + aNode 扩展字段
  sbtValidated?: boolean
  pntBalance?: bigint
  securityRisk?: number
}

// aNode Paymaster 响应
interface ANodePaymasterResponse extends PaymasterResponse {
  validation: {
    sbtValidated: boolean
    pntBalanceValidated: boolean
    securityRisk: number
  }
  processing: {
    modules: string[]
    totalDuration: string
    service: string
  }
}
```

#### 内部模块设计

基于 ZeroDev 架构推导：

```
aNode Paymaster
├── SBT Validator        # 灵魂绑定代币验证
├── PNT Validator        # 项目原生代币验证
├── Security Filter      # 安全风险评估
├── Gas Estimator        # Gas 估算服务
├── Policy Engine        # 策略执行引擎
└── Paymaster Signer     # 签名服务
```

#### 错误处理策略

```typescript
// aNode 自定义错误
enum ANodePaymasterErrors {
  SBT_NOT_FOUND = -32001,
  INSUFFICIENT_PNT = -32002,
  SECURITY_RISK_HIGH = -32003,
  POLICY_VIOLATION = -32004
}
```

### 7. 关键洞察与决策

#### 确定的设计决策

1. **多协议支持** - 同时支持 RESTful 和 JSON-RPC 2.0
2. **EntryPoint 兼容** - 支持 v0.6, v0.7, v0.8
3. **模式灵活性** - 支持 verifying 和 ERC20 模式
4. **Gas 估算** - 集成 gas 估算功能
5. **策略引擎** - 支持复杂的赞助策略

#### 推测性设计决策

1. **aNode 增强功能** - SBT/PNT 验证作为扩展
2. **安全过滤** - 在 paymaster 层面增加安全检查
3. **监控体系** - 完整的指标收集和日志记录
4. **多链支持** - 设计时考虑多区块链兼容性

### 8. 实现路线图

#### Phase 1: 基础功能 (当前)
- ✅ 实现核心 paymaster 接口
- 🔄 添加 SBT 验证逻辑
- 🔄 添加 PNT 余额检查
- 🔄 实现安全风险评估

#### Phase 2: 高级功能
- 完整的策略引擎
- 多链支持
- 企业级监控

#### Phase 3: 性能优化
- 缓存机制
- 并发处理优化
- 数据库优化

## 结论

通过对 ZeroDev SDK、examples 和文档的深入分析，我们确定了 paymaster 应用的核心设计模式：

1. **服务接口**：以 JSON-RPC 2.0 为主，辅以 RESTful API
2. **数据结构**：严格遵循 ERC-4337 标准，支持 EntryPoint 多版本
3. **错误处理**：标准化错误码和响应格式
4. **内部逻辑**：模块化设计，支持多种 paymaster 模式

aNode 的独特价值在于在此基础上增加了 SBT/PNT 验证和安全过滤，为项目特定的 paymaster 服务提供了差异化竞争优势。

---

## 补充：mock-paymaster 分析

### mock-paymaster 是什么？

**mock-paymaster** 是 `permissionless.js` 库中的一个**真实可用的 Node.js 实现**，用于 ERC-4337 paymaster 服务的测试和原型开发。

### 核心特性分析

#### 技术实现
- **Web 框架**：基于 Fastify 的完整 HTTP 服务器
- **API 协议**：支持 JSON-RPC 2.0 和 RESTful API
- **区块链集成**：与 viem 库深度集成，支持多链
- **EntryPoint 支持**：兼容 v0.6, v0.7, v0.8 版本

#### 功能特性
- **赞助模式**：`pm_sponsorUserOperation` - Gas 赞助核心功能
- **数据获取**：`pm_getPaymasterData` - 获取签名后的 paymaster 数据
- **存根数据**：`pm_getPaymasterStubData` - 获取估算用存根数据
- **策略验证**：`pm_validateSponsorshipPolicies` - 赞助策略验证

#### Paymaster 模式
```typescript
type PaymasterMode =
  | { mode: "verifying" }        // 验证模式：paymaster 验证并签名
  | { mode: "erc20", token: Address } // ERC20 模式：用户用代币支付
```

### 内部处理流程

从 `relay.ts` 分析的核心处理逻辑：

```
1. 请求验证 → 验证 JSON-RPC 格式和参数
2. EntryPoint 检查 → 确认支持的版本 (v0.6/v0.7/v0.8)
3. Paymaster 地址映射 → 根据 EntryPoint 获取对应合约地址
4. Gas 估算 (可选) → 调用 bundler 估算 gas 用量
5. 签名生成 → 构造 paymasterAndData 并签名
6. 响应返回 → 返回完整的 paymaster 数据
```

### 对 aNode 项目的启发

#### 确定的设计模式
1. **API 接口设计** - JSON-RPC 2.0 + RESTful 双协议支持
2. **数据验证** - 使用 Zod 进行严格的输入验证
3. **错误处理** - 标准化的 JSON-RPC 错误响应
4. **模块化架构** - 清晰的职责分离 (relay, schema, utils)

#### 可以借鉴的实现
1. **Fastify 集成** - 轻量级 Node.js web 框架选择
2. **Zod 验证** - TypeScript 友好的数据验证方案
3. **多版本支持** - EntryPoint v0.6/v0.7/v0.8 的兼容处理
4. **测试集成** - 与 bundler 的深度集成测试

### aNode 扩展设计

基于 mock-paymaster 的模式，aNode 可以增加：

```typescript
// aNode 增强的 paymaster 响应
interface ANodePaymasterResponse extends PaymasterResponse {
  validation: {
    sbtValidated: boolean      // SBT 验证结果
    pntBalanceValidated: boolean // PNT 余额验证
    securityRisk: number       // 安全风险评分
  }
  processing: {
    modules: string[]          // 处理的模块列表
    totalDuration: string      // 总处理时间
    service: string           // 服务标识
  }
}
```

### 总结

mock-paymaster 作为一个**完整可运行的参考实现**，为 aNode paymaster 的设计提供了宝贵的实践指导：

1. **技术选型** - Fastify + viem + Zod 的组合证明是可行的
2. **API 设计** - JSON-RPC 2.0 协议的实现模式
3. **错误处理** - 标准化错误码和响应格式
4. **测试策略** - 与 bundler 的集成测试方法

这为 aNode 从设计到实现的路径提供了清晰的技术参考和最佳实践指导。

---

*分析基于 ZeroDev SDK v0.6+ 和相关文档*
*推导过程结合了 permissionless.js mock-paymaster 实现*
