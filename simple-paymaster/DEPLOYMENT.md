# aNodePaymaster 部署指南

## 📋 前置要求

- ✅ Node.js 18+
- ✅ pnpm
- ✅ Cloudflare 账户
- ✅ 已部署的 Paymaster 合约 (地址: `0x321eB27CA443ED279503b121E1e0c8D87a4f4B51`)

## 🚀 部署步骤

### 1. 环境准备

```bash
# 克隆项目 (如果还没有)
git clone <repository-url>
cd simple-paymaster

# 安装依赖
pnpm install

# 登录 Cloudflare
pnpm wrangler login
```

### 2. 配置 KV 命名空间

```bash
# 创建 KV 命名空间 (如果还没有)
pnpm wrangler kv:namespace create "CACHE_KV"
pnpm wrangler kv:namespace create "SETTLEMENT_KV"
```

**更新 `wrangler.toml` 中的 KV ID:**
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "你的_CACHE_KV_ID"

[[kv_namespaces]]
binding = "SETTLEMENT_KV"
id = "你的_SETTLEMENT_KV_ID"
```

### 3. 配置密钥

```bash
# 设置 Paymaster 私钥
pnpm wrangler secret put PAYMASTER_PRIVATE_KEY

# 设置 RPC URLs
pnpm wrangler secret put SEPOLIA_RPC_URL
pnpm wrangler secret put ETHEREUM_RPC_URL
```

### 4. 本地测试

```bash
# 运行生产就绪测试
node test-production.mjs

# 启动本地开发服务器
pnpm run dev

# 测试 API 端点
curl http://localhost:8787/health
curl -X POST http://localhost:8787/api/v1/paymaster/process \
  -H "Content-Type: application/json" \
  -d '{"userOperation": {...}}'
```

### 5. 部署到生产环境

```bash
# 部署到 Cloudflare Workers
pnpm wrangler deploy --env production
```

## 🎉 部署成功！

**生产环境 URL:**
```
https://anode-simple-paymaster-prod.jhfnetboy.workers.dev
```

**API 端点:**
- Health Check: `GET /health`
- Paymaster API: `POST /api/v1/paymaster/process`

## 🔧 配置验证

### 检查部署状态

```bash
# 查看部署日志
pnpm wrangler tail

# 检查 Worker 状态
pnpm wrangler deployments list
```

### 验证 API 功能

```bash
# 健康检查
curl https://你的-worker.你的账户.workers.dev/health

# Paymaster API 测试
curl -X POST https://你的-worker.你的账户.workers.dev/api/v1/paymaster/process \
  -H "Content-Type: application/json" \
  -d '{"userOperation": {"sender": "0x...", ...}}'
```

## 📊 监控和维护

### 日志查看

```bash
# 查看实时日志
pnpm wrangler tail

# 查看特定时间段的日志
pnpm wrangler tail --format=pretty --since=1h
```

### 性能监控

- Cloudflare Workers 控制台
- KV 存储使用情况
- API 响应时间

### 更新部署

```bash
# 更新代码
git pull origin main

# 重新部署
pnpm run deploy
```

## 🔒 安全配置

### 密钥管理

- 使用 `wrangler secret put` 设置敏感信息
- 不要在代码中硬编码私钥
- 定期轮换密钥

### 访问控制

- 配置 CORS 设置 (在 `wrangler.toml` 中)
- 实施速率限制
- 监控异常访问模式

## 🚨 故障排除

### 常见问题

**1. 部署失败**
```bash
# 检查 wrangler 配置
pnpm wrangler whoami

# 验证 KV 命名空间
pnpm wrangler kv:namespace list
```

**2. API 返回 404**
```bash
# 检查 Worker URL
curl https://你的-worker.你的账户.workers.dev/health

# 查看 wrangler 路由
pnpm wrangler routes list
```

**3. Paymaster 合约调用失败**
```bash
# 验证合约地址配置
grep PAYMASTER_CONTRACT_ADDRESS wrangler.toml

# 检查合约部署状态
# (使用区块链浏览器验证合约地址)
```

## 📈 扩展和优化

### Phase 2 功能规划

- 🔄 直接支付模式集成
- 💰 代币支付支持
- 📊 结算系统
- 🔐 安全模块
- 📈 性能优化

### 监控指标

- API 请求数量
- 响应时间分布
- 错误率统计
- Gas 使用情况
- 合约交互成功率

## 📞 支持

如遇到问题，请检查：

1. 📖 文档: `README.md`, `USAGE.md`
2. 🔍 日志: `pnpm wrangler tail`
3. 🧪 测试: `node test-production.mjs`
4. 📊 监控: Cloudflare Workers 控制台

---

## 🎯 部署检查清单

- [ ] Cloudflare 账户配置完成
- [ ] KV 命名空间创建并配置
- [ ] 所有密钥设置完成
- [ ] 本地测试全部通过
- [ ] 生产环境部署成功
- [ ] API 端点响应正常
- [ ] 监控和日志配置完成
- [ ] 安全配置验证通过

**✅ 部署完成后，你的 aNodePaymaster 就可以为用户提供无 gas 的交易体验了！**
