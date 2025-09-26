# End-to-End Testing Guide

## 🎯 测试概述

我们提供了两个层级的测试：

### 1. 基本功能测试 (无需私钥)
```bash
node test-simple.mjs
```

**测试内容：**
- ✅ 健康检查端点
- ✅ 传统 paymaster 模式
- ✅ 直接支付模式检测  
- ✅ 错误处理机制

### 2. 真实交易测试 (需要私钥)
```bash
# 设置环境变量
export OWNER_PRIVATE_KEY="0x...your_private_key"
node test-e2e.mjs
```

**测试内容：**
- 🔍 查询真实账户余额
- 📝 生成真实的 UserOperation
- 🔐 通过 paymaster 签名验证
- 🚀 准备链上执行

## 🔧 配置说明

### 测试账户信息
- **EntryPoint**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` (v0.6)
- **SimpleAccount A**: `0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6`
- **SimpleAccount B**: `0x27243FAc2c0bEf46F143a705708dC4A7eD476854`
- **PNT Token**: `0x3e7B771d4541eC85c8137e950598Ac97553a337a`

### 环境变量设置
```bash
# 必需：SimpleAccount A 的 owner 私钥
export OWNER_PRIVATE_KEY="0x...your_private_key_here"

# 可选：paymaster 签名私钥 (如果不同)
export PAYMASTER_PRIVATE_KEY="0x...paymaster_private_key"
```

### 自定义配置
复制并修改配置文件：
```bash
cp e2e-config.example.mjs e2e-config.mjs
# 编辑 e2e-config.mjs 填入您的配置
```

## 🧪 测试流程

### Phase 1: 基本验证 ✅
1. **API 响应测试**: 验证所有端点正常
2. **模式检测测试**: 验证 paymaster vs direct-payment 
3. **错误处理测试**: 验证异常情况处理

### Phase 2: 真实交易准备 🚀
1. **余额查询**: 检查 PNT token 余额
2. **Nonce 获取**: 从 SimpleAccount 获取当前 nonce
3. **UserOp 生成**: 创建 ERC20 转账的 UserOperation
4. **Paymaster 签名**: 通过我们的服务获取签名
5. **交易准备**: 准备好可提交的完整 UserOperation

### Phase 3: 链上执行 (手动)
生成的 UserOperation 可以通过以下方式提交：
- 直接调用 `EntryPoint.handleOps()`
- 使用 bundler 服务提交
- 通过 AA SDK 提交

## 📊 测试结果示例

### 基本测试输出：
```
🧪 Testing aNodePaymaster API
=============================
1️⃣ Testing health check...
  ✅ Health check passed: ok

2️⃣ Testing traditional paymaster mode...
  ✅ Traditional paymaster mode working!
    Payment method: paymaster
    PaymasterAndData length: 181

3️⃣ Testing direct payment mode...
  ✅ Direct payment mode working!
    Payment method: direct-payment

🎉 All basic tests completed successfully!
```

### E2E 测试输出：
```
🚀 Starting aNodePaymaster E2E Test
=====================================
1️⃣ Checking initial balances...
  Account A PNT Balance: 1000000000000000000
  Account B PNT Balance: 0

2️⃣ Getting nonce for SimpleAccount A...
  Current nonce: 0

3️⃣ Generating UserOperation for ERC20 transfer...
  Transfer amount: 1000000000000000 wei
  UserOperation generated:
    Sender: 0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6
    Nonce: 0x0

4️⃣ Processing through aNodePaymaster...
  ✅ Paymaster processing successful!
    Payment method: paymaster
    PaymasterAndData length: 181

🎉 E2E Test completed successfully!
```

## 🔐 安全注意事项

1. **私钥安全**: 
   - 仅在测试网使用
   - 不要提交私钥到代码仓库
   - 使用环境变量传递敏感信息

2. **测试网资金**:
   - 确保测试账户有足够的 Sepolia ETH
   - 确保 SimpleAccount A 有 PNT token 余额
   - Paymaster 合约需要有 EntryPoint 存款

3. **网络配置**:
   - 确认连接到 Sepolia 测试网
   - 验证 RPC 端点可用性
   - 检查 gas 价格设置合理

## 🚀 下一步

完成测试后，您的 aNodePaymaster 将完全准备好：

1. **生产部署**: 部署到 Cloudflare Workers
2. **监控集成**: 添加日志和指标收集  
3. **扩展功能**: 集成更多支付方式
4. **安全加固**: 添加速率限制和验证规则

**恭喜！您的 ERC-4337 Paymaster 服务已经完全可用！** 🎉
