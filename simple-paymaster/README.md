# aNode Simple Paymaster

aNode Simple Paymaster 是一个基于 Cloudflare Workers 的轻量级 ERC-4337 Paymaster 服务，专为 Phase 1 设计，支持传统 Paymaster 和直接支付模式。

## 特性

- 🚀 **Cloudflare Workers** - 无服务器边缘计算
- 🔧 **Phase 1 实现** - 极简 Paymaster 功能
- 💰 **双支付模式** - 支持传统 Paymaster 和直接支付
- 🔒 **类型安全** - 完整的 TypeScript 支持
- 📦 **零配置** - 开箱即用的开发体验
- 🧪 **测试覆盖** - 完整的单元测试

## 快速开始

### 前置条件

- Node.js 18+
- pnpm
- Cloudflare 账户

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd simple-paymaster

# 安装依赖
pnpm install

# 登录 Cloudflare (首次使用)
pnpm wrangler login

# 创建 KV 命名空间
pnpm wrangler kv:namespace create "CACHE_KV"
pnpm wrangler kv:namespace create "SETTLEMENT_KV"
```

### 配置

1. 更新 `wrangler.toml` 中的 KV 命名空间 ID
2. 设置必要的密钥：

```bash
# 设置 Paymaster 私钥 (开发环境)
pnpm wrangler secret put PAYMASTER_PRIVATE_KEY

# 设置 RPC URL
pnpm wrangler secret put SEPOLIA_RPC_URL
```

### 开发

```bash
# 启动本地开发服务器
pnpm run dev
```

### 部署

```bash
# 部署到 Cloudflare
pnpm run deploy --env production
```

**生产环境 URL:**
```
https://anode-simple-paymaster-prod.jhfnetboy.workers.dev
```

## API 参考

aNode Simple Paymaster 提供 RESTful API，支持 ERC-4337 EntryPoint v0.6 和 v0.7。

### API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/v1/paymaster/process` | POST | 处理 UserOperation (自动检测版本) |
| `/api/v1/paymaster/process/v06` | POST | 处理 v0.6 UserOperation |
| `/api/v1/paymaster/process/v07` | POST | 处理 v0.7 UserOperation |

### 支持的 EntryPoint 版本

- **EntryPoint v0.6** (默认): `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- **EntryPoint v0.7**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

### 版本选择方式

API 支持三种方式指定 EntryPoint 版本：

1. **URL 路径方式** (推荐): 使用版本特定的端点
2. **请求体参数**: 在请求体中指定 `entryPointVersion`
3. **自动检测**: 默认使用 v0.6

## API 详情

### 1. 健康检查

获取服务状态和版本信息。

**请求:**
```http
GET /health
```

**响应:**
```json
{
  "status": "ok",
  "service": "aNode Simple Paymaster",
  "version": "0.1.0",
  "phase": "Phase 1: Basic Paymaster",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**cURL 示例:**
```bash
curl -X GET https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/health
```

### 2. 处理 UserOperation

处理 ERC-4337 UserOperation，生成 paymasterAndData 或直接支付配置。

**请求:**
```http
POST /api/v1/paymaster/process
Content-Type: application/json

{
  "userOperation": {
    "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
    "nonce": "0x0",
    "initCode": "0x",
    "callData": "0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8",
    "callGasLimit": "0x5208",
    "verificationGasLimit": "0x186a0",
    "preVerificationGas": "0x5208",
    "maxFeePerGas": "0x3b9aca00",
    "maxPriorityFeePerGas": "0x3b9aca00",
    "paymasterAndData": "0x",
    "signature": "0x..."
  },
  "entryPointVersion": "0.6"
}
```

**请求参数:**

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `userOperation` | Object | 是 | ERC-4337 UserOperation 对象 |
| `entryPointVersion` | String | 否 | EntryPoint 版本: `"0.6"` 或 `"0.7"`，默认 `"0.6"` |

**UserOperation 字段 (v0.6):**

| 字段 | 类型 | 描述 |
|------|------|------|
| `sender` | String | 发送方地址 |
| `nonce` | String | 账户 nonce |
| `initCode` | String | 账户初始化代码 |
| `callData` | String | 调用数据 |
| `callGasLimit` | String | 调用 gas 限制 |
| `verificationGasLimit` | String | 验证 gas 限制 |
| `preVerificationGas` | String | 预验证 gas |
| `maxFeePerGas` | String | 最大 gas 费用 |
| `maxPriorityFeePerGas` | String | 最大优先费用 |
| `paymasterAndData` | String | Paymaster 数据和签名 |
| `signature` | String | 用户签名 |

**UserOperation 字段 (v0.7):**

| 字段 | 类型 | 描述 |
|------|------|------|
| `sender` | String | 发送方地址 |
| `nonce` | String | 账户 nonce |
| `initCode` | String | 账户初始化代码 |
| `callData` | String | 调用数据 |
| `accountGasLimits` | String | 打包的 callGasLimit + verificationGasLimit |
| `preVerificationGas` | String | 预验证 gas |
| `gasFees` | String | 打包的 maxFeePerGas + maxPriorityFeePerGas |
| `paymasterAndData` | String | Paymaster 数据和签名 |
| `signature` | String | 用户签名 |

**响应:**
```json
{
  "success": true,
  "userOperation": {
    "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
    "nonce": "0x0",
    "initCode": "0x",
    "callData": "0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8",
    "callGasLimit": "0x5208",
    "verificationGasLimit": "0x186a0",
    "preVerificationGas": "0x5208",
    "maxFeePerGas": "0x3b9aca00",
    "maxPriorityFeePerGas": "0x3b9aca00",
    "paymasterAndData": "0x0000000000000039cd5e8ae05257ce51c473ddd10000000000000000000000000000000000000000000000000000000000000000",
    "signature": "0x..."
  },
  "paymentMethod": "paymaster",
  "processing": {
    "modules": ["basic_paymaster"],
    "totalDuration": "45ms",
    "service": "aNode Paymaster v0.1.0"
  }
}
```

**响应字段:**

| 字段 | 类型 | 描述 |
|------|------|------|
| `success` | Boolean | 处理是否成功 |
| `userOperation` | Object | 处理后的 UserOperation |
| `paymentMethod` | String | 支付方法: `"paymaster"` 或 `"direct-payment"` |
| `processing` | Object | 处理信息 |
| `error` | Object | 错误信息 (仅在失败时) |

**cURL 示例 (v0.6 - URL 路径方式):**
```bash
curl -X POST https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process/v06 \
  -H "Content-Type: application/json" \
  -d '{
    "userOperation": {
      "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
      "nonce": "0x0",
      "initCode": "0x",
      "callData": "0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8",
      "callGasLimit": "0x5208",
      "verificationGasLimit": "0x186a0",
      "preVerificationGas": "0x5208",
      "maxFeePerGas": "0x3b9aca00",
      "maxPriorityFeePerGas": "0x3b9aca00",
      "paymasterAndData": "0x",
      "signature": "0x1234567890abcdef"
    }
  }'
```

**cURL 示例 (v0.7 - URL 路径方式):**
```bash
curl -X POST https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process/v07 \
  -H "Content-Type: application/json" \
  -d '{
    "userOperation": {
      "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
      "nonce": "0x0",
      "initCode": "0x",
      "callData": "0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8",
      "accountGasLimits": "0x000000000000000000000000000052080000000000000000000000000000186a0",
      "preVerificationGas": "0x5208",
      "gasFees": "0x000000000000000000000000003b9aca000000000000000000000000003b9aca00",
      "paymasterAndData": "0x",
      "signature": "0x1234567890abcdef"
    }
  }'
```

**cURL 示例 (自动检测版本):**
```bash
curl -X POST https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process \
  -H "Content-Type: application/json" \
  -d '{
    "userOperation": {
      "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
      "nonce": "0x0",
      "initCode": "0x",
      "callData": "0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8",
      "callGasLimit": "0x5208",
      "verificationGasLimit": "0x186a0",
      "preVerificationGas": "0x5208",
      "maxFeePerGas": "0x3b9aca00",
      "maxPriorityFeePerGas": "0x3b9aca00",
      "paymasterAndData": "0x",
      "signature": "0x1234567890abcdef"
    },
    "entryPointVersion": "0.6"
  }'
```

### 3. 错误处理

API 遵循标准的 HTTP 状态码和 JSON 错误响应格式。

**错误响应示例:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_USER_OPERATION",
    "message": "Invalid UserOperation format for the configured EntryPoint version"
  }
}
```

**常见错误码:**

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| `INVALID_REQUEST` | 400 | 请求格式无效 |
| `INVALID_USER_OPERATION` | 400 | UserOperation 格式错误 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

**支付模式选择:**

- **传统 Paymaster**: 当 `maxFeePerGas` 和 `maxPriorityFeePerGas` 不为 `0x0` 时
- **直接支付**: 当 `maxFeePerGas` 和 `maxPriorityFeePerGas` 都为 `0x0` 时

## 支付模式

### 1. 传统 Paymaster 模式

当 `maxFeePerGas` 和 `maxPriorityFeePerGas` 不为 `0x0` 时，使用传统 Paymaster 模式：

- 生成 `paymasterAndData`
- Paymaster 合约支付 gas 费用
- 链上验证签名

### 2. 直接支付模式

当 `maxFeePerGas` 和 `maxPriorityFeePerGas` 为 `0x0` 时，使用直接支付模式：

- `paymasterAndData` 为空 (`0x`)
- Bundler 直接支付 gas 费用
- 链下结算

## 开发

### 测试

```bash
# 运行测试
pnpm test

# 监听模式
pnpm test:watch
```

### 代码检查

```bash
# 运行 linting
pnpm run lint

# 自动修复
pnpm run lint:fix
```

### 清理

```bash
# 清理构建文件和依赖
pnpm run clean
```

## 项目结构

```
simple-paymaster/
├── src/
│   ├── index.ts          # Cloudflare Workers 入口
│   ├── paymaster.ts      # 核心 Paymaster 逻辑
│   ├── types.ts          # 类型定义
│   └── paymaster.test.ts # 测试文件
├── wrangler.toml         # Cloudflare Workers 配置
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── biome.json           # 代码格式化配置
├── vitest.config.ts     # 测试配置
└── README.md            # 项目文档
```

## 环境变量

### Wrangler Secrets (生产环境)

```bash
PAYMASTER_PRIVATE_KEY     # Paymaster 私钥
SEPOLIA_RPC_URL          # Sepolia RPC URL
ETHEREUM_RPC_URL         # 主网 RPC URL (可选)
```

### Wrangler Variables (wrangler.toml)

```toml
NODE_ENV = "development"
LOG_LEVEL = "info"
ENTRYPOINT_V07_ADDRESS = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
PAYMASTER_CONTRACT_ADDRESS = "0x950C417F1Ed59496ad26810a103dBC3585714986"
DEBUG = "true"
ENABLE_METRICS = "true"
```

## 许可证

MIT License