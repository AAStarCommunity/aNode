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