use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    console_log!("🚀 aNode Paymaster Worker started");

    // Simple routing
    match req.path().as_str() {
        "/" => Response::ok("aNode Paymaster Worker - ERC-4337 Service\n\nEndpoints:\n- GET /health - Health check\n- POST /api/v1/paymaster/sponsor - Sponsor gas\n- POST /api/v1/paymaster/process - Process user operation"),
        "/health" => Response::ok("{\"status\": \"healthy\", \"service\": \"aNode Paymaster\", \"version\": \"0.1.0\"}"),
        "/api/v1/paymaster/sponsor" => handle_sponsor(req).await,
        "/api/v1/paymaster/process" => handle_process(req).await,
        _ => Response::error("Not Found", 404),
    }
}

async fn handle_sponsor(_req: Request) -> Result<Response> {
    console_log!("📝 Processing paymaster sponsor request");

    // Mock paymaster response
    let response = serde_json::json!({
        "paymasterAndData": "0x1234567890abcdefabcdef1234567890abcdef12",
        "preVerificationGas": "21000",
        "verificationGasLimit": "100000",
        "callGasLimit": "200000",
        "message": "Gas sponsored successfully",
        "service": "aNode Paymaster",
        "timestamp": worker::Date::now().as_millis()
    });

    console_log!("✅ Successfully sponsored user operation");

    Response::from_json(&response)
}

async fn handle_process(_req: Request) -> Result<Response> {
    console_log!("🔄 Processing complete user operation");

    // Mock validation results
    let response = serde_json::json!({
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
            "service": "aNode Paymaster"
        },
        "timestamp": worker::Date::now().as_millis()
    });

    console_log!("✅ User operation processed successfully");

    Response::from_json(&response)
}
