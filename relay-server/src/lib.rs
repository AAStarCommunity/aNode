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
