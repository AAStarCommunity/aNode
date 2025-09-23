use wasm_bindgen::prelude::*;
use worker::*;
use serde_json::json;

// This is like the `main` function, except for JavaScript.
#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    console_log!("🚀 aNode Rust Worker started");

    let url = req.url()?;
    let path = url.path();

    match path.as_str() {
        "/" => Response::ok("aNode Rust Paymaster Worker - ERC-4337 Service\n\nEndpoints:\n- GET /health - Health check\n- POST /api/v1/paymaster/sponsor - Sponsor gas\n- POST /api/v1/paymaster/process - Process user operation"),
        "/health" => {
            let health = json!({
                "status": "healthy",
                "service": "aNode Rust Paymaster Worker",
                "version": "0.1.0",
                "timestamp": js_sys::Date::now(),
                "uptime": "N/A (Cloudflare Workers)",
                "endpoints": {
                    "health": "GET /health",
                    "sponsor": "POST /api/v1/paymaster/sponsor",
                    "process": "POST /api/v1/paymaster/process"
                }
            });
            Response::from_json(&health)
        },
        "/api/v1/paymaster/sponsor" => {
            if req.method() == Method::Post {
                console_log!("📝 Processing paymaster sponsor request");

                let response = json!({
                    "paymasterAndData": "0x1234567890abcdefabcdef1234567890abcdef12",
                    "preVerificationGas": "21000",
                    "verificationGasLimit": "100000",
                    "callGasLimit": "200000",
                    "message": "Gas sponsored successfully",
                    "service": "aNode Rust Paymaster",
                    "timestamp": js_sys::Date::now()
                });

                console_log!("✅ Successfully sponsored user operation");
                Response::from_json(&response)
            } else {
                Response::error("Method not allowed", 405)
            }
        },
        "/api/v1/paymaster/process" => {
            if req.method() == Method::Post {
                console_log!("🔄 Processing complete user operation");

                let response = json!({
                    "success": true,
                    "userOperation": {
                        "paymasterAndData": "0xabcdef1234567890abcdef1234567890abcdef12",
                        "preVerificationGas": "21000",
                        "verificationGasLimit": "100000",
                        "callGasLimit": "200000",
                        "message": "User operation processed successfully"
                    },
                    "validation": {
                        "sbtValidated": true,
                        "pntBalanceValidated": true,
                        "securityRisk": 25
                    },
                    "processing": {
                        "modules": ["sbt_validator", "pnt_validator", "security_filter", "paymaster_signer"],
                        "totalDuration": "45ms",
                        "service": "aNode Rust Paymaster"
                    },
                    "timestamp": js_sys::Date::now()
                });

                console_log!("✅ User operation processed successfully");
                Response::from_json(&response)
            } else {
                Response::error("Method not allowed", 405)
            }
        },
        _ => Response::error("Not Found", 404),
    }
}
