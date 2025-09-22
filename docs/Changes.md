# Changes

## Version 1.0.0-web (2025-09-22)

- 🎉 **重大更新**: 添加完整的 ERC-4337 Web 测试界面 `web-app/`
- 🔐 **双重签名支持**: MetaMask 钱包集成 + 私钥开发模式
- 📊 **实时监控**: Bundler 状态监控和连接检测
- ⛽ **Gas 工具**: 完整的 Gas 费用计算器和预估工具
- 🏗️ **UserOperation**: 自动构建和发送 ERC-4337 交易
- 👛 **账户管理**: EOA, SimpleAccount A/B 地址管理
- 🌐 **多网络**: 支持 Sepolia, OP Sepolia, OP Mainnet 切换
- 🧪 **测试完整**: 25/25 Playwright E2E 测试通过
- 🚀 **生产就绪**: Vercel 部署配置和环境变量管理
- 📱 **响应式**: 支持桌面、平板、手机多端适配

**技术栈**:
- React 18 + TypeScript + Vite
- ethers.js v6 (Account Abstraction)
- Playwright E2E 测试框架
- pnpm 包管理器

**部署方式**:
- 本地开发: `pnpm dev`
- 测试运行: `pnpm test`
- 生产部署: Vercel 自动部署

**Git 标签**: `v1.0.0-web`
**仓库名称**: 已更新为 aNode (https://github.com/AAStarCommunity/aNode)

## Version 0.1.8

- Created comprehensive env.example configuration template
- Included all configuration variables for Demo App, Rust Relay Server, Paymaster Service, Blockchain, Security Filters, Monitoring, and External Services
- Organized configuration by functional areas with detailed comments
- Provided sensible defaults and clear placeholder values
- Covered development, testing, production, and performance tuning configurations

## Version 0.1.7

- Created comprehensive Detailed System Design document for aPaymaster Relay Server
- Designed modular Rust-based paymaster architecture with configurable filtering modules
- Documented core modules: Request Handler, UserOperation Processor, Paymaster Service, Transaction Simulator, Filter Manager
- Specified security filter modules: Phishing Detector, Amount Validator, Rate Limiter
- Defined complete API interfaces with function signatures and parameter specifications
- Included system interaction flows and configuration schemas
- Added performance considerations, security measures, and self-assessment
- Designed plugin-based architecture for independent filter development

## Version 0.1.6

- Confirmed singleton-paymaster submodule is properly initialized
- Created relay-server/ directory with initialized Rust project (aapaymaster-relay)
- Rust project successfully compiles and runs with `cargo check` and `cargo run`
- Updated .gitignore to exclude Rust build artifacts (target/, Cargo.lock)
- Cleaned up git repository by removing build artifacts from version control

## Version 0.1.5

- Added Node.js .gitignore for proper project structure
- Added smart-account-frame-template submodule for reference implementation
- Created comprehensive aPaymaster Demo SPA (Single Page Application)
- Built interactive UI for testing ERC-4337 UserOperations with real-time logging
- Implemented configurable parameters for paymaster server, bundler, and transaction details
- Added support for both sponsorship and ERC-20 payment modes
- Included detailed step-by-step execution logs and error handling
- Created modern UI with Tailwind CSS and Lucide React icons
- ✅ Application successfully builds and runs (tested with `pnpm build` and `pnpm dev`)

## Version 0.1.4

- Added comprehensive test case demo for aPaymaster server
- Created end-to-end ERC-4337 UserOperation flow example
- Demonstrated both sponsorship and ERC-20 payment modes
- Included mock server implementation patterns
- Added success criteria and error scenario testing guidelines

## Version 0.1.3

- Added comprehensive Paymaster Server Design documentation
- Analyzed permissionless.js and tutorial examples to reverse-engineer paymaster server interfaces
- Created detailed workflow diagram and API specifications
- Documented ERC-20 and sponsorship payment modes
- Included security, scalability, and business logic considerations

## Version 0.1.2

- Added tutorials submodule to vendor folder from https://github.com/pimlicolabs/tutorials
- This submodule provides educational content and examples for Pimlico account abstraction tools

## Version 0.1.1

- Added permissionless.js submodule to vendor folder from https://github.com/pimlicolabs/permissionless.js
- This submodule provides TypeScript utilities built on viem for ERC-4337 account abstraction
- Includes smart account management, bundler support, paymaster integration, and user operation utilities

## Version 0.1.0

- Added singleton-paymaster submodule to vendor folder from https://github.com/pimlicolabs/singleton-paymaster
- This submodule provides ERC-4337 paymaster implementation supporting both ERC-4337 paymaster implementation supporting both ERC-20 and Pimlico balance payment modes
- Includes compatibility with EntryPoint v0.6, v0.7, and v0.8
