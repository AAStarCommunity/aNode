# Cloudflare Workers Rust 开发指南

## 官方文档学习总结

基于 [Cloudflare Workers Rust 官方文档](https://developers.cloudflare.com/workers/languages/rust/) 的学习记录。

## 核心概念

### Workers Runtime 与 WASM

Cloudflare Workers 支持使用 Rust 编写，通过 WebAssembly (WASM) 在边缘运行。与 JavaScript Workers 不同，Rust 代码被编译为 WASM，然后通过 JavaScript shim 与 Workers 运行时交互。

### 关键工具链

1. **wasm-bindgen**: JavaScript ↔ Rust 互操作
2. **wasm-bindgen-futures**: Rust Futures ↔ JavaScript Promises
3. **worker-build**: Cloudflare 专用构建工具
4. **wasm-opt**: 二进制大小优化

## 项目结构

### 标准项目结构

```
my-worker/
├── Cargo.toml
├── wrangler.toml
└── src/
    └── lib.rs
```

### Cargo.toml 配置

```toml
[package]
name = "my-worker"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
worker = "0.5"  # Cloudflare Workers Rust bindings

[profile.release]
lto = true
strip = true
codegen-units = 1
opt-level = "z"
```

### wrangler.toml 配置

```toml
name = "my-worker"
main = "build/worker/shim.mjs"
compatibility_date = "2024-01-01"

[build]
command = "cargo install -q worker-build && worker-build --release"

[vars]
NODE_ENV = "production"
```

## 事件处理器

### Fetch 事件

```rust
use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    Response::ok("Hello, World!")
}
```

### 参数说明

- **Request**: 传入的 HTTP 请求
- **Env**: 环境变量和绑定 (KV, D1, etc.)
- **Context**: 运行时上下文 (waitUntil, passThroughOnException)

### 其他事件类型

```rust
#[event(scheduled)]
pub async fn scheduled(event: ScheduledEvent, env: Env, ctx: Context) {
    // Cron job 处理
}

#[event(queue)]
pub async fn queue(batch: MessageBatch<CustomMessage>, env: Env, ctx: Context) -> Result<()> {
    // Queue 消息处理
}
```

## 构建和部署流程

### 1. 本地开发

```bash
# 安装 wrangler
npm install -g wrangler

# 启动开发服务器
wrangler dev
```

### 2. 部署到生产

```bash
# 部署到 Cloudflare
wrangler deploy
```

### 3. 内部构建流程

1. **Rust 编译**: `cargo build --target wasm32-unknown-unknown`
2. **WASM 生成**: worker-build 创建 JavaScript shim
3. **优化**: wasm-opt 减小二进制大小
4. **打包**: Wrangler 打包并上传

## 路由和中间件

### Router 使用

```rust
use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    let router = Router::new();

    router
        .get("/", |_, _| Response::ok("Home"))
        .get("/api/:id", |_, ctx| {
            let id = ctx.param("id").unwrap_or("unknown");
            Response::ok(format!("API: {}", id))
        })
        .run(req, env).await
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
cp -r temp-template/templates/hello-world cloudflare-demo
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
