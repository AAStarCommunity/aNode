# aNode 开发指南

## 概述

本文档描述了 aNode 项目的开发策略、架构设计和实施指南。aNode 是一个基于 ERC-4337 的 paymaster 服务，提供去中心化的 gas 赞助功能。

## 开发策略

### 双版本并行开发策略

aNode 采用 **JS 先行，Rust 对标** 的双版本并行开发策略，确保快速迭代和高质量交付。

#### Phase 1: 完善 JS 版本 (当前重点)

**目标**: 打造功能完整、性能稳定的 JS paymaster 服务

**任务清单**:
- ✅ 基础 API 实现 (`/health`, `/sponsor`, `/process`)
- 🔄 SBT 验证逻辑 (从 mock 到真实合约集成)
- 🔄 PNT 余额检查 (集成真实代币合约)
- 🔄 安全风险评估 (接入安全分析服务)
- 🔄 Gas 估算优化 (更准确的 gas 计算)
- 🔄 错误处理完善 (标准 ERC-4337 错误响应)
- 🔄 监控和日志 (性能指标收集)
- 🔄 配置管理 (环境变量优化)

**测试要求**:
- 单元测试覆盖
- 集成测试验证
- 压力测试评估
- 安全审计通过

#### Phase 2: Rust 版本功能对标

**目标**: JS 版本的完整 Rust 重写，实现高性能企业级服务

**迁移策略**:
- 1:1 功能映射 (API 接口完全一致)
- 逐步模块替换 (一个模块一个模块迁移)
- 双版本并行运行 (A/B 测试验证)
- 灰度发布 (逐步切换流量)

**技术栈升级**:
- `axum + tokio` (高性能 web 框架)
- `alloy/ethers` (以太坊集成)
- `PostgreSQL + Redis` (数据存储)
- 自定义签名服务 (AWS KMS, Cloudflare Secrets 等)
- 完整的监控和可观测性体系

#### Phase 3: 性能优化和安全加固

**目标**: Rust 版本达到生产级标准

**性能优化**:
- 内存使用优化 (减少 GC 压力)
- 并发处理提升 (tokio 异步优化)
- 数据库查询优化 (索引和缓存策略)
- 网络请求优化 (连接池复用)

**安全加固**:
- 输入验证强化
- 速率限制实现
- 加密通信 (HTTPS/TLS)
- 审计日志记录

#### Phase 4: JS 版本逐步下线

**目标**: 优雅完成技术栈迁移

**下线策略**:
- 维护模式 (只接受已知用户)
- 数据迁移 (历史数据转移)
- 用户通知 (提前告知切换)
- 最终下线 (清理资源)

### 为什么选择双版本策略？

| 优势 | 说明 |
|------|------|
| 🚀 快速上线 | JS 版本开发周期短，快速提供服务 |
| 🧪 业务验证 | 先验证业务逻辑，再进行技术优化 |
| 🔄 低风险迁移 | 功能对标迁移，降低切换风险 |
| 💰 成本控制 | JS 原型验证，Rust 长期投资 |
| 🎯 技术演进 | 从可用(MVP)到卓越的清晰路径 |

## 项目结构

```
aNode/
├── cloudflare-js-worker/     # JS 版本 paymaster (生产服务)
├── relay-server/            # Rust 版本 relay server (开发中)
├── relay-server-backup/     # 原 Rust 架构备份
├── docs/                    # 项目文档
├── vendor/                  # 第三方依赖 (ZeroDev 等)
└── README.md               # 项目说明
```

### 服务状态

| 服务 | URL | 状态 | 说明 |
|------|-----|------|------|
| JS Paymaster | https://anode-js-worker.jhfnetboy.workers.dev | ✅ 生产就绪 | 完整 ERC-4337 API |
| Rust Relay | https://anode-relay-server.jhfnetboy.workers.dev | 🚧 开发中 | v0.01 Hello World |

## 开发环境设置

### 前置要求

- Node.js 18+
- Rust 1.70+
- Wrangler CLI
- Git

### 本地开发

```bash
# 克隆项目
git clone https://github.com/AAStarCommunity/aNode.git
cd aNode

# JS Worker 本地开发
cd cloudflare-js-worker
npm install
npm run dev

# Rust Worker 本地开发
cd ../relay-server
cargo build
cargo run
```

## 贡献指南

### 代码规范

- JS: ESLint + Prettier
- Rust: rustfmt + clippy
- Git 提交信息遵循 Conventional Commits

### 分支策略

- `main`: 生产分支
- `feat/rust-aNode`: Rust 版本开发分支
- `feature/*`: 功能分支

### 测试策略

- 单元测试: 核心业务逻辑
- 集成测试: API 接口验证
- E2E 测试: 完整用户流程
- 性能测试: 压力和负载测试

## API 设计

### Paymaster API 接口

#### POST /api/v1/paymaster/sponsor
Gas 赞助请求

**请求体**:
```json
{
  "userOp": {
    "sender": "0x...",
    "nonce": "0x...",
    "initCode": "0x...",
    "callData": "0x...",
    "callGasLimit": "0x...",
    "verificationGasLimit": "0x...",
    "preVerificationGas": "0x...",
    "maxFeePerGas": "0x...",
    "maxPriorityFeePerGas": "0x...",
    "paymasterAndData": "0x...",
    "signature": "0x..."
  }
}
```

**响应**:
```json
{
  "paymasterAndData": "0x...",
  "preVerificationGas": "0x...",
  "verificationGasLimit": "0x...",
  "callGasLimit": "0x...",
  "message": "Gas sponsored successfully"
}
```

#### POST /api/v1/paymaster/process
完整用户操作处理

**请求体**: 同 sponsor 接口

**响应**:
```json
{
  "success": true,
  "userOperation": {
    "paymasterAndData": "0x...",
    "preVerificationGas": "0x...",
    "verificationGasLimit": "0x...",
    "callGasLimit": "0x...",
    "message": "User operation processed successfully"
  },
  "validation": {
    "sbtValidated": true,
    "pntBalanceValidated": true,
    "securityRisk": 25
  },
  "processing": {
    "modules": ["sbt_validator", "pnt_validator", "security_filter", "paymaster_signer"],
    "totalDuration": "45ms",
    "service": "aNode Paymaster"
  }
}
```

## 部署指南

### JS Worker 部署

```bash
cd cloudflare-js-worker
wrangler deploy
```

### Rust Worker 部署

```bash
cd relay-server
wrangler deploy
```

## 监控和运维

### 健康检查

```bash
# JS Worker
curl https://anode-js-worker.jhfnetboy.workers.dev/health

# Rust Worker (未来)
curl https://anode-relay-server.jhfnetboy.workers.dev/health
```

### 日志查看

```bash
# Cloudflare Workers 日志
wrangler tail

# 应用级日志 (未来)
# 集成第三方监控服务
```

## 安全考虑

### 输入验证
- 所有用户输入进行严格验证
- 使用参数化查询防止注入攻击
- 实现速率限制防止滥用

### 密钥管理
- 从不硬编码私钥
- 使用环境变量或密钥管理服务
- 定期轮换密钥

### 网络安全
- 强制 HTTPS
- 实现 CORS 策略
- 定期安全审计

## 故障排除

### 常见问题

1. **Wrangler 部署失败**
   - 检查 wrangler.toml 配置
   - 确认环境变量设置
   - 查看 Cloudflare 账户权限

2. **API 调用失败**
   - 检查请求格式
   - 验证参数类型
   - 查看错误日志

3. **性能问题**
   - 监控响应时间
   - 检查资源使用情况
   - 优化数据库查询

## 路线图

- **v0.1.0**: JS 版本功能完善
- **v0.2.0**: Rust 版本基础功能
- **v1.0.0**: Rust 版本生产就绪
- **v1.1.0**: 企业级功能 (多链支持等)

## 联系方式

- 项目主页: https://github.com/AAStarCommunity/aNode
- 问题反馈: GitHub Issues
- 讨论交流: Discord/Telegram
