# 🧪 A、B 测试账户配置指南

## 📋 测试账户信息

### 共享私钥控制
所有账户由同一个私钥控制，简化测试流程：

```bash
私钥: 0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81
```

### 账户地址

| 角色 | 地址 | 用途 |
|------|------|------|
| **EOA (控制者)** | `0x411BD567E46C0781248dbB6a9211891C032885e5` | 支付 gas 费用 |
| **账户 A (发送方)** | `0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6` | PNT 代币发送方 |
| **账户 B (接收方)** | `0x27243FAc2c0bEf46F143a705708dC4A7eD476854` | PNT 代币接收方 |

## 💰 资金需求

### 1. EOA 地址 (用于 gas 费用)
```
地址: 0x411BD567E46C0781248dbB6a9211891C032885e5
需要: 0.05 ETH (Sepolia 测试网)
用途: 支付 UserOperation 的 gas 费用
```

### 2. SimpleAccount A (发送方)
```
地址: 0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6
需要: 100 PNT 代币
用途: 测试转账的发送方
```

### 3. SimpleAccount B (接收方)
```
地址: 0x27243FAc2c0bEf46F143a705708dC4A7eD476854
需要: 0 PNT (初始为空，接收转账)
用途: 测试转账的接收方
```

## 🚰 获取测试资金

### ETH (Sepolia 测试网)
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Alchemy Faucet**: https://sepoliafaucets.alchemy.com/sepolia
- **发送到**: `0x411BD567E46C0781248dbB6a9211891C032885e5`

### PNT 代币
- **合约地址**: `0x3e7B771d4541eC85c8137e950598Ac97553a337a`
- **发送到**: `0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6` (SimpleAccount A)

## 🧪 测试步骤

### 1. 更新配置
确保 `.env` 文件包含正确配置：

```bash
# Test accounts controlled by same private key
PRIVATE_KEY="0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81"
PRIVATE_KEY_A="0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81"
PRIVATE_KEY_B="0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81"

# EOA Address (owner of both SimpleAccounts)
EOA_ADDRESS="0x411BD567E46C0781248dbB6a9211891C032885e5"

# SimpleAccount addresses
SIMPLE_ACCOUNT_A="0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6"
SIMPLE_ACCOUNT_B="0x27243FAc2c0bEf46F143a705708dC4A7eD476854"
```

### 2. 存入测试资金
1. 向 EOA 发送 0.05 ETH
2. 向 SimpleAccount A 发送 100 PNT

### 3. 检查余额
```bash
node checkBalance.js
```

### 4. 运行转账测试
```bash
# 转账 10 PNT 从 A 到 B
npm run test:ab 10

# 或者直接运行
node src/testABTransfer.js 10
```

## 🔧 技术说明

### preVerificationGas = 44844 的原因
ERC-4337 EntryPoint v0.6 要求 preVerificationGas 最少为 44844，包括：
- **Bundler 处理开销**: 解析、验证 UserOperation 结构
- **内存池操作**: 存储和管理 UserOperation
- **网络传输**: RPC 调用和数据传输成本
- **签名验证预处理**: EntryPoint 验证前的初步检查

### SimpleAccount 部署
- 如果 SimpleAccount 未部署，首次交易会自动部署
- 使用 SimpleAccountFactory 的 `getAddress()` 计算确定性地址
- 账户 A 使用 salt = 0，账户 B 使用 salt = 1

## 📊 预期结果

成功的转账测试应该显示：
```
🎯 转账验证: ✅ 成功
📈 余额变化:
账户 A 减少: 10.0 PNT
账户 B 增加: 10.0 PNT
```

## 🐛 常见问题

### AA23 签名验证错误
- **原因**: 私钥与 SimpleAccount owner 不匹配
- **解决**: 确保使用正确的私钥配置

### InsufficientFees 错误
- **原因**: gas 价格过低
- **解决**: 已在 fly.toml 中优化 gas 配置

### 余额不足
- **原因**: 账户没有足够的 ETH 或 PNT
- **解决**: 按照资金需求章节存入测试资金

---

生成时间: 2025-09-21
状态: 等待用户存入测试资金后进行测试