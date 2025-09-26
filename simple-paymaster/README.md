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

## API

**aNode Simple Paymaster 提供以下 RPC API：**

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "aNode Simple Paymaster",
  "version": "0.1.0",
  "phase": "Phase 1: Basic Paymaster"
}
```

### Process UserOperation

```http
POST /api/v1/paymaster/process
Content-Type: application/json

{
  "userOperation": {
    "sender": "0x...",
    "nonce": "0x...",
    "initCode": "0x...",
    "callData": "0x...",
    "callGasLimit": "0x...",
    "verificationGasLimit": "0x...",
    "preVerificationGas": "0x...",
    "maxFeePerGas": "0x...",
    "maxPriorityFeePerGas": "0x...",
    "paymasterAndData": "0x",
    "signature": "0x..."
  }
}
```

Response:
```json
{
  "success": true,
  "userOperation": {
    "sender": "0x...",
    "nonce": "0x...",
    "initCode": "0x...",
    "callData": "0x...",
    "callGasLimit": "0x...",
    "verificationGasLimit": "0x...",
    "preVerificationGas": "0x...",
    "maxFeePerGas": "0x...",
    "maxPriorityFeePerGas": "0x...",
    "paymasterAndData": "0x1234567890123456789012345678901234567890186a0c35000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "signature": "0x..."
  },
  "paymentMethod": "paymaster",
  "processing": {
    "modules": ["basic_paymaster"],
    "totalDuration": "50ms",
    "service": "aNode Paymaster v0.1.0"
  }
}
```

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
PAYMASTER_CONTRACT_ADDRESS = "0x0000000000000039cd5e8ae05257ce51c473ddd1"
DEBUG = "true"
ENABLE_METRICS = "true"
```

## 许可证

MIT License