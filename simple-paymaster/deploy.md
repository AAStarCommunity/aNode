# aNodePaymaster 部署指南

## 部署到 Sepolia 测试网

使用以下命令部署 paymaster 合约到 Sepolia：

```bash
cd simple-paymaster/contracts

# 方法1：使用您的私钥直接部署
forge script script/DeployPaymaster.s.sol \
  --fork-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N \
  --private-key YOUR_TEST_Deployer_PRIVATE_KEY \
  --broadcast \
  --verify

# 方法2：如果您已经设置了环境变量
export PRIVATE_KEY=YOUR_TEST_Deployer_PRIVATE_KEY
forge script script/DeployPaymaster.s.sol \
  --fork-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N \
  --broadcast \
  --verify
```

## 部署信息

- **EntryPoint v0.6**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- **网络**: Sepolia (Chain ID: 11155111)
- **预估 Gas**: ~1,786,522
- **预估费用**: ~0.0000018 ETH

## 部署后配置

部署成功后，请更新以下配置：

1. **TypeScript Worker 配置**:
   - 更新 `wrangler.toml` 中的 `PAYMASTER_CONTRACT_ADDRESS`
   - 确保 `ENTRYPOINT_VERSION = "0.6"`

2. **初始资金**:
   - 部署后需要向 paymaster 存入一些 ETH 以支付 gas
   - 可以调用 `deposit()` 方法或直接转账 ETH

## 验证部署

部署成功后，您可以在 Sepolia Etherscan 上查看合约：
`https://sepolia.etherscan.io/address/YOUR_DEPLOYED_ADDRESS`

## 测试命令

```bash
# 运行本地测试
forge test

# 运行特定测试
forge test --match-test testDeployment -vvv
```
