# 🚀 aNodePaymaster 使用指南

## 快速开始

### 1. 基本功能测试 (推荐先运行)
```bash
# 确保开发服务器正在运行
pnpm run dev

# 在新终端运行基本测试
node test-simple.mjs
```

### 2. 真实交易测试 (需要私钥)
```bash
# 使用您的私钥作为参数
node test-with-key.mjs 0x1234567890abcdef...your_private_key_here
```

## 📋 测试说明

### 基本测试 (`test-simple.mjs`)
- ✅ **无需私钥**，安全快速
- 测试所有 API 端点功能
- 验证 paymaster 和 direct-payment 模式
- 检查错误处理机制

### 真实交易测试 (`test-with-key.mjs`)
- 🔐 **需要 SimpleAccount A 的 owner 私钥**
- 查询真实的链上数据 (余额、nonce)
- 生成真实的 ERC20 转账 UserOperation
- 通过 paymaster 获取签名
- 输出可提交的完整交易

## 🎯 测试账户信息

您提供的测试环境：
- **SimpleAccount A**: `0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6`
- **SimpleAccount B**: `0x27243FAc2c0bEf46F143a705708dC4A7eD476854`
- **PNT Token**: `0x3e7B771d4541eC85c8137e950598Ac97553a337a`
- **EntryPoint v0.6**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`

## 💡 使用示例

### 示例 1: 基本功能验证
```bash
$ node test-simple.mjs

🧪 Testing aNodePaymaster API
=============================
1️⃣ Testing health check...
  ✅ Health check passed: ok
2️⃣ Testing traditional paymaster mode...
  ✅ Traditional paymaster mode working!
3️⃣ Testing direct payment mode...
  ✅ Direct payment mode working!
🎉 All basic tests completed successfully!
```

### 示例 2: 真实交易测试
```bash
$ node test-with-key.mjs 0xYOUR_PRIVATE_KEY

🚀 aNodePaymaster Real E2E Test
================================
1️⃣ Getting token information...
  Token Symbol: PNT
  Token Decimals: 18
2️⃣ Checking account balances...
  Account A Balance: 1.0 PNT
  Account B Balance: 0 PNT
3️⃣ Getting SimpleAccount nonce...
  Current nonce: 0
4️⃣ Generating UserOperation...
  Transfer amount: 0.001 PNT
  ✅ UserOperation generated
5️⃣ Processing through aNodePaymaster...
  ✅ Paymaster processing successful!
6️⃣ Signing UserOperation...
  ✅ UserOperation signed
🎉 Real E2E Test Completed Successfully!
```

## 🔐 安全提醒

1. **仅在测试网使用**: 所有测试都在 Sepolia 测试网进行
2. **私钥安全**: 私钥通过命令行参数传递，不会保存
3. **测试资金**: 确保账户有足够的测试 ETH 和 PNT token

## 📊 测试结果解读

### 成功指标
- ✅ 所有步骤显示绿色勾号
- ✅ Paymaster 返回有效的 `paymasterAndData`
- ✅ UserOperation 签名成功
- ✅ 最终输出完整的 JSON 格式交易

### 可能的问题
- ❌ 网络连接问题 → 检查 RPC 端点
- ❌ 余额不足 → 确保账户有 PNT token
- ❌ 签名失败 → 检查私钥是否正确

## 🚀 下一步操作

测试成功后，生成的 UserOperation 可以：

1. **直接提交到链上**:
   ```solidity
   EntryPoint.handleOps([userOperation], beneficiary)
   ```

2. **通过 Bundler 服务**:
   - 提交到 bundler 网络
   - 自动处理 gas 估算和提交

3. **集成到您的 DApp**:
   - 使用生成的 paymaster 签名
   - 实现无 gas 交易体验

**恭喜！您的 aNodePaymaster 已经完全就绪！** 🎊
