# aNode
aNode is a permissionless and public goods for community to support their own ERC-20 token for gas sponsor, useroperation security check and more feats.

- ERC-4337 bundler support (Pimlico, Alchemy, AAStar Rundler)
- ERC-20 PNTs and Community customized ERC-20 gas token support
- Self-running paymaster support with SuperPaymaster relay and contract(if you want publish your ERC-20 gas token)
- Entrypoint V06 support
- Entrypoint V07, V08 is working on (inlude EIP-7704, EOA delegation)

Just send me useroperation!

## Phase design
1. Phase 1: a off-chain **paymaster** signature node, working with on-chain contract.
  - sign after verify the useroperation and sender account SBT and PNTs balance
  - contract invoke by Entrypoint(validatePaymasterSignaure)
  - contract set and change different public key on-chain contract by owner
2. Phase 2: a passkey signature **validator**
  - invoked by outer aNode to verify it is user's will, returen a aNode BLS signature aggregation
  - if the BLS collection is enough, act as a sender, send to bundler RPC
  - will be changed for PQC
3. Phase 3: hardware dependent, **account manager** with TEE security guarantee
  - support web interface for account life management(many details)
  - support RPC API for KMS service
4. Phase 4: **Guardian** as social recovery and deadman's switch and more security service
  - join gourp weight for multi signature on creating AA account
  - verify special useroperation for changing the private key, by social verifications, not onchain
  - provide signature to confirm the special useroperation
  - the last guardian will submit to bundler if signature is enough
  - will change to Hash algorithm cause of Post Quantumn Computing


## On chain contract
We use pimlico singliton paymaster contract as initial version, thanks for their love and contribution.
It act as onchain deposit account to Entrypoint, and a manageable public key to verify off chain signature.
Entrypoint will invoke it's function to verify.
It must register to SuperPaymaster to join the OpenPNTs and OpenCards and more protocols to use infras.
We provide a 5-minutes guidance to do this.

## Off chain relay
We use Rust to develop a new simple version, you can deploy it to Cloudflare with almost zero cost.
We reference the Nodejs paymaster from ZeroDev, thanks for their contribution.
It act as a off chain signer(can rotate) after verifying their pre-setting rules(like only support specific contract, specific ERC-20 and more).

## Register on SuperPaymaster to run
This mechanism requires SuperPaymaster(include one contract and permissionless relays), which act as a register, a stake contract and smart router(relay do this).

## Documentation Structure

aNode maintains comprehensive documentation in the `docs/` directory:

### Core Architecture Documents
- **[aNodeFrameworkAndPaymasterModuleDesign.md](docs/aNodeFrameworkAndPaymasterModuleDesign.md)** - Unified framework and paymaster module design, including ERC-4337 integration, modular architecture, and API interfaces
- **[aNodeRoadmap.md](docs/aNodeRoadmap.md)** - Complete aNode development roadmap across 4 phases (Paymaster → Passkey Validator → Account Manager → Guardian System)
- **[aNodeArchitectureDesign.md](docs/aNodeArchitectureDesign.md)** - Overall architecture design with pluggable modules and ZeroDev compatibility

### Technical Implementation Documents
- **[aNodeAPIDesign.md](docs/aNodeAPIDesign.md)** - Multi-protocol API design (RESTful + JSON-RPC) with comprehensive endpoint specifications
- **[aNodePolicySystem.md](docs/aNodePolicySystem.md)** - Policy management system based on ZeroDev patterns with advanced rate limiting and rule engines
- **[SigningAndKeyManagement.md](docs/SigningAndKeyManagement.md)** - Pluggable signing mechanisms supporting Local, AWS KMS, Cloudflare Secrets, and Keyless SSL
- **[ERC4337FlowDiagram.md](docs/ERC4337FlowDiagram.md)** - Complete ERC-4337 flow integration with aNode enhancements
- **[ModuleDesign.md](docs/ModuleDesign.md)** - Detailed module architecture with internal call sequence diagrams

### Development and Deployment Documents
- **[ALCHEMY_ACCOUNT_KIT_LEARNING.md](docs/ALCHEMY_ACCOUNT_KIT_LEARNING.md)** - Alchemy Account Kit integration learning and examples
- **[DEPLOY.md](docs/DEPLOY.md)** - Web application deployment guide
- **[TEST_REPORT.md](docs/TEST_REPORT.md)** - Testing reports and Playwright test results
- **[DetailedSystemDesign.md](docs/DetailedSystemDesign.md)** - Detailed system design specifications
- **[PaymasterServerDesign.md](docs/PaymasterServerDesign.md)** - Legacy paymaster server design (superseded by unified framework)
- **[RustPaymasterServerDesign.md](docs/RustPaymasterServerDesign.md)** - Legacy Rust implementation design (superseded by unified framework)

### Development Guides
- **[ERC4337-AB-Test-Guide.md](docs/ERC4337-AB-Test-Guide.md)** - ERC-4337 Account Abstraction testing guide
- **[setup-guide.md](docs/setup-guide.md)** - Development environment setup guide
- **[README-test-accounts.md](docs/README-test-accounts.md)** - Test accounts and configuration guide

## Live Demo

🚀 **aNode Paymaster Worker is now live on Cloudflare!**

**Production URL**: https://anode-js-worker.jhfnetboy.workers.dev

**Available Endpoints**:
- `GET /` - Service information and documentation
- `GET /health` - Health check endpoint
- `POST /api/v1/paymaster/sponsor` - Gas sponsorship endpoint
- `POST /api/v1/paymaster/process` - Full user operation processing with validation

**Test the live service**:
```bash
# Health check
curl https://anode-js-worker.jhfnetboy.workers.dev/health

# Process a user operation
curl -X POST https://anode-js-worker.jhfnetboy.workers.dev/api/v1/paymaster/process \
  -H "Content-Type: application/json"
```

### Worker Status

| Worker Type | Status | URL | Notes |
|-------------|--------|-----|-------|
| **JavaScript Worker** | ✅ **Live** | https://anode-js-worker.jhfnetboy.workers.dev | Full ERC-4337 paymaster API |
| **Rust Worker** | ✅ **Live** | https://anode-rust-demo.jhfnetboy.workers.dev | Hello World demo using official workers-rs template |
| **aNode Relay Server** | ✅ **Live** | https://anode-relay-server.jhfnetboy.workers.dev | aNode v0.01 - ERC-4337 Paymaster Service (Hello World) |

**Rust Worker 兼容性说明**:
- 当前 wrangler 版本：4.38.0
- Worker crate 兼容性：需要 wrangler 2.x 或 3.x 早期版本
- 建议解决方案：使用 JavaScript Worker 或等待 Cloudflare 修复兼容性
- 代码位置：`cloudflare-worker/` 和 `cloudflare-rust-simple/`

## Quick Start

```bash
# Clone the repository
git clone https://github.com/AAStarCommunity/aNode.git
cd aNode

# Install dependencies for web app
cd web-app && pnpm install

# Start development server
pnpm run dev

# Test Cloudflare Worker locally
cd ../cloudflare-js-worker && wrangler dev --port 8788

# For Rust paymaster server (future)
cd ../relay-server && cargo build
```

## Contributing

1. Read the [aNode Roadmap](docs/aNodeRoadmap.md) to understand the project vision
2. Review [Module Design](docs/ModuleDesign.md) for architecture guidelines
3. Follow the [API Design](docs/aNodeAPIDesign.md) for interface specifications
4. Check [Policy System](docs/aNodePolicySystem.md) for configuration patterns

## License

This project is licensed under the MIT License. 


}
```

## 数据序列化

### JSON 处理

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct User {
    id: u32,
    name: String,
}

#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    // 解析 JSON
    let user: User = req.json().await?;

    // 返回 JSON
    Response::from_json(&user)
}
```

## 绑定和存储

### 环境变量

```rust
#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    let api_key = env.var("API_KEY")?.to_string();
    Response::ok(format!("API Key: {}", api_key))
}
```

### KV 存储

```rust
#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    let kv = env.kv("MY_KV")?;
    kv.put("key", "value")?.execute().await?;
    let value = kv.get("key").text().await?;
    Response::ok(format!("Value: {:?}", value))
}
```

## 最佳实践

### 性能优化

1. **编译优化**: 使用 `opt-level = "z"` 和 `lto = true`
2. **二进制大小**: `strip = true` 移除调试信息
3. **代码分割**: `codegen-units = 1` 优化链接

### 错误处理

```rust
#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    match process_request(&req, &env).await {
        Ok(response) => response,
        Err(e) => Response::error(format!("Error: {}", e), 500)
    }
}
```

### 异步编程

```rust
#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    // 并发执行多个异步任务
    let (result1, result2) = tokio::join!(
        async_operation1(&env),
        async_operation2(&env)
    );

    Response::from_json(&serde_json::json!({
        "result1": result1?,
        "result2": result2?
    }))
}
```

## 部署故障排除

### 常见问题

1. **构建失败**: 检查 Rust 版本 (需要 1.70+)
2. **部署失败**: 检查 wrangler 版本兼容性
3. **运行时错误**: 检查 WASM 模块导出

### 调试技巧

```bash
# 查看构建输出
wrangler dev --verbose

# 检查 WASM 文件
ls -la build/worker/

# 查看运行时日志
wrangler tail
```

## 创建 Hello World 示例

基于官方文档，我们成功创建并部署了一个 Rust Hello World 应用。

### ✅ 成功部署结果

**生产 URL**: https://anode-rust-demo.jhfnetboy.workers.dev

**测试响应**:
```bash
curl https://anode-rust-demo.jhfnetboy.workers.dev/
# 返回:
🌟 Hello World from Rust on Cloudflare Workers!

📍 Request Details:
• Method: GET
• URL: https://anode-rust-demo.jhfnetboy.workers.dev/
• Timestamp: [当前时间戳]
• Runtime: Cloudflare Workers
• Language: Rust + WebAssembly
• Framework: workers-rs v0.6

🎉 Successfully deployed Rust application using official template!
```

### 📋 实际实现步骤

#### 步骤 1: 使用官方模板

```bash
# 安装 cargo-generate
cargo install cargo-generate

# 克隆官方模板仓库
git clone https://github.com/cloudflare/workers-rs.git temp-template
cp -r temp-template/templates/hello-world [your-project-name]
```

#### 步骤 2: 配置项目

**Cargo.toml**:
```toml
[package]
name = "anode-rust-demo"
version = "0.1.0"
edition = "2021"
authors = ["aNode Team"]

[lib]
crate-type = ["cdylib"]

[dependencies]
worker = { version = "0.6" }
worker-macros = { version = "0.6" }

[profile.release]
lto = true
strip = true
codegen-units = 1
opt-level = "z"
```

**wrangler.toml**:
```toml
name = "anode-rust-demo"
main = "build/worker/shim.mjs"
compatibility_date = "2025-01-18"

[build]
command = "cargo install -q worker-build && worker-build --release"

[vars]
NODE_ENV = "production"
```

#### 步骤 3: 实现主逻辑

**src/lib.rs**:
```rust
use worker::*;

#[event(fetch)]
async fn fetch(
    req: Request,
    _env: Env,
    _ctx: Context,
) -> Result<Response> {
    let method = req.method();
    let url = req.url()?.to_string();

    let response = format!(
        "🌟 Hello World from Rust on Cloudflare Workers!\n\n📍 Request Details:\n• Method: {}\n• URL: {}\n• Timestamp: {}\n• Runtime: Cloudflare Workers\n• Language: Rust + WebAssembly\n• Framework: workers-rs v0.6\n\n🎉 Successfully deployed Rust application using official template!",
        method.as_ref(),
        url,
        js_sys::Date::now() as u64
    );

    Response::ok(response)
}
```

#### 步骤 4: 构建和部署

```bash
# 构建项目
cargo build --release --target wasm32-unknown-unknown

# 本地测试
wrangler dev --port 8789

# 部署到生产
wrangler deploy
```

### 🔧 关键修复

1. **移除 console_error_panic_hook**: 官方模板中包含但实际不需要
2. **修复生命周期问题**: 使用 `req.method()` 而不是 `req.method().as_ref()`
3. **使用最新版本**: worker 0.6 而不是 0.5
4. **正确的主文件路径**: `build/worker/shim.mjs`

### 📊 性能指标

- **构建时间**: ~8 秒 (release 模式)
- **包大小**: 273.10 KiB (压缩后 113.81 KiB)
- **启动时间**: 1ms (生产环境)
- **响应时间**: < 50ms

### 🎯 结论

**✅ Cloudflare Workers 对 Rust 的支持完全可用！**

通过官方模板，我们成功创建、构建并部署了一个 Rust WebAssembly 应用到 Cloudflare 边缘网络。

关键要点：
- 使用 `cargo generate cloudflare/workers-rs` 或手动复制模板
- 正确配置 wrangler.toml (使用 `build/worker/shim.mjs`)
- 使用最新版本的 worker crate (0.6)
- 注意 Rust 生命周期管理
- 性能优秀，适合生产环境使用

## aNode Relay Server v0.01 部署记录

### ✅ 部署成功结果

**生产 URL**: https://anode-relay-server.jhfnetboy.workers.dev

**测试响应**:
```bash
curl https://anode-relay-server.jhfnetboy.workers.dev/
# 返回:
🚀 aNode Relay Server v0.0.1 - Hello World!

📊 Server Information:
• Service: aNode Relay Server
• Version: 0.0.1
• Status: Running
• Runtime: Cloudflare Workers
• Language: Rust + WebAssembly
• Framework: workers-rs v0.6

📍 Request Details:
• Method: GET
• URL: https://anode-relay-server.jhfnetboy.workers.dev/
• Timestamp: [当前时间戳]

🎯 This is aNode Relay Server v0.01 - ERC-4337 Paymaster Service
🔜 Future features: SBT validation, PNT balance checks, gas sponsorship

⏰ Server Time: [时间戳]ms since Unix epoch
```

### 📋 aNode Relay Server 重新初始化步骤

#### 步骤 1: 备份并清空原有项目

```bash
# 备份原有项目
mv relay-server relay-server-backup

# 创建新项目目录
mkdir relay-server
cd relay-server
cargo init --lib
```

#### 步骤 2: 配置 Cargo.toml

```toml
[package]
name = "anode-relay-server"
version = "0.0.1"
edition = "2021"
authors = ["aNode Team"]
description = "aNode Relay Server v0.01 - ERC-4337 Paymaster Service"

[lib]
crate-type = ["cdylib"]

[dependencies]
worker = { version = "0.6" }
worker-macros = { version = "0.6" }

[profile.release]
lto = true
strip = true
codegen-units = 1
opt-level = "z"
```

#### 步骤 3: 配置 wrangler.toml

```toml
name = "anode-relay-server"
main = "build/worker/shim.mjs"
compatibility_date = "2025-01-18"

[build]
command = "cargo install -q worker-build && worker-build --release"

[vars]
NODE_ENV = "production"
SERVICE_NAME = "aNode Relay Server"
VERSION = "0.0.1"
```

#### 步骤 4: 实现 Hello World 逻辑

**src/lib.rs**:
```rust
use worker::*;

#[event(fetch)]
async fn fetch(
    req: Request,
    env: Env,
    _ctx: Context,
) -> Result<Response> {
    let method = req.method();
    let url = req.url()?.to_string();
    let timestamp = js_sys::Date::now() as u64;

    // 获取环境变量
    let service_name = env.var("SERVICE_NAME")?.to_string();
    let version = env.var("VERSION")?.to_string();

    let response = format!(
        "🚀 aNode Relay Server v{} - Hello World!\n\n📊 Server Information:\n• Service: {}\n• Version: {}\n• Status: Running\n• Runtime: Cloudflare Workers\n• Language: Rust + WebAssembly\n• Framework: workers-rs v0.6\n\n📍 Request Details:\n• Method: {}\n• URL: {}\n• Timestamp: {}\n\n🎯 This is aNode Relay Server v0.01 - ERC-4337 Paymaster Service\n🔜 Future features: SBT validation, PNT balance checks, gas sponsorship\n\n⏰ Server Time: {}ms since Unix epoch",
        version,
        service_name,
        version,
        method.as_ref(),
        url,
        timestamp,
        timestamp
    );

    Response::ok(response)
}
```

#### 步骤 5: 构建和部署

```bash
# 构建项目
cargo build --release --target wasm32-unknown-unknown

# 本地测试
wrangler dev --port 8790

# 部署到生产
wrangler deploy
```

### 📊 性能指标

- **构建时间**: ~2 分钟 (首次下载依赖)
- **包大小**: 275.24 KiB (压缩后 114.73 KiB)
- **启动时间**: 1ms (生产环境)
- **响应时间**: < 50ms
- **环境变量**: 3 个 (NODE_ENV, SERVICE_NAME, VERSION)

### 🎯 未来发展路线

aNode Relay Server v0.01 是基础版本，后续将逐步添加：

1. **v0.1.0**: 基础 ERC-4337 支持
   - UserOperation 验证
   - 基础 paymaster 逻辑

2. **v0.2.0**: 安全功能
   - SBT 验证机制
   - PNT 余额检查
   - 安全过滤器

3. **v0.3.0**: 高级功能
   - 多链支持
   - 策略引擎
   - 数据库集成

4. **v1.0.0**: 完整 paymaster 服务
   - 全功能 ERC-4337 实现
   - 生产就绪架构

---

## 总结

Cloudflare Workers Rust 支持提供了强大的边缘计算能力：

✅ **优点**:
- Rust 的性能和安全性
- 编译时类型检查
- 零成本抽象
- 优秀的内存安全

⚠️ **注意事项**:
- 需要熟悉 WASM 生态
- 构建时间较长
- 调试相对复杂
- 依赖 wrangler 工具链稳定

🚀 **适用场景**:
- 高性能计算密集型任务
- 需要强类型保证的应用
- 对安全性要求极高的服务
- 希望利用 Rust 生态的开发者
