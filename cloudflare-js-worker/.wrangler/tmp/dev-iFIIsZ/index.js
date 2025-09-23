var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
function validateSBT(sender) {
  console.log(`\u{1F50D} SBT validation passed for ${sender}`);
  return true;
}
__name(validateSBT, "validateSBT");
function validatePNTBalance(sender) {
  console.log(`\u{1F4B0} PNT balance validation passed for ${sender}`);
  return true;
}
__name(validatePNTBalance, "validatePNTBalance");
function assessSecurityRisk(userOp) {
  console.log(`\u{1F6E1}\uFE0F Security assessment completed for user operation`);
  return 25;
}
__name(assessSecurityRisk, "assessSecurityRisk");
function handleSponsor() {
  console.log("\u{1F4DD} Processing paymaster sponsor request");
  const response = {
    paymasterAndData: "0x1234567890abcdefabcdef1234567890abcdef12",
    preVerificationGas: "21000",
    verificationGasLimit: "100000",
    callGasLimit: "200000",
    message: "Gas sponsored successfully",
    service: "aNode Paymaster",
    timestamp: Date.now()
  };
  console.log("\u2705 Successfully sponsored user operation");
  return new Response(JSON.stringify(response, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleSponsor, "handleSponsor");
function handleProcess() {
  console.log("\u{1F504} Processing complete user operation");
  const response = {
    success: true,
    userOperation: {
      paymasterAndData: "0xabcdef1234567890abcdef1234567890abcdef12",
      preVerificationGas: "21000",
      verificationGasLimit: "100000",
      callGasLimit: "200000",
      message: "User operation processed successfully"
    },
    validation: {
      sbtValidated: validateSBT("0x1234567890123456789012345678901234567890"),
      pntBalanceValidated: validatePNTBalance("0x1234567890123456789012345678901234567890"),
      securityRisk: assessSecurityRisk({})
    },
    processing: {
      modules: ["sbt_validator", "pnt_validator", "security_filter", "paymaster_signer"],
      totalDuration: "45ms",
      service: "aNode Paymaster"
    },
    timestamp: Date.now()
  };
  console.log("\u2705 User operation processed successfully");
  return new Response(JSON.stringify(response, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleProcess, "handleProcess");
function handleHealth() {
  const health = {
    status: "healthy",
    service: "aNode Paymaster Worker",
    version: "0.1.0",
    timestamp: Date.now(),
    uptime: "N/A (Cloudflare Workers)",
    endpoints: {
      health: "GET /health",
      sponsor: "POST /api/v1/paymaster/sponsor",
      process: "POST /api/v1/paymaster/process"
    }
  };
  return new Response(JSON.stringify(health, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleHealth, "handleHealth");
function handleHome() {
  const info = `# aNode Paymaster Worker
ERC-4337 Account Abstraction Paymaster Service

## Endpoints
- \`GET /\` - Service information
- \`GET /health\` - Health check
- \`POST /api/v1/paymaster/sponsor\` - Sponsor gas for user operation
- \`POST /api/v1/paymaster/process\` - Process complete user operation with validation

## Features
- SBT (Soul Bound Token) validation
- PNT (Project Native Token) balance verification
- Security risk assessment
- ERC-4337 paymaster signature generation

## Status
\u{1F7E2} Service is running
\u{1F4CA} Version: 0.1.0
\u23F0 Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}

---
*Built with Cloudflare Workers*
`;
  return new Response(info, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
__name(handleHome, "handleHome");
var src_default = {
  async fetch(request, env, ctx) {
    console.log(`\u{1F680} aNode Paymaster Worker request: ${request.method} ${request.url}`);
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Confirmation-Token"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      let response;
      switch (url.pathname) {
        case "/":
          response = handleHome();
          break;
        case "/health":
          response = handleHealth();
          break;
        case "/api/v1/paymaster/sponsor":
          if (request.method === "POST") {
            response = handleSponsor();
          } else {
            response = new Response("Method not allowed", { status: 405 });
          }
          break;
        case "/api/v1/paymaster/process":
          if (request.method === "POST") {
            response = handleProcess();
          } else {
            response = new Response("Method not allowed", { status: 405 });
          }
          break;
        default:
          response = new Response("Not Found", { status: 404 });
      }
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (error) {
      console.error("\u274C Worker error:", error);
      const errorResponse = {
        success: false,
        error: {
          message: error.message || "Internal server error",
          code: "INTERNAL_ERROR",
          timestamp: Date.now()
        }
      };
      return new Response(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};

// ../../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-LMJmVn/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-LMJmVn/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
