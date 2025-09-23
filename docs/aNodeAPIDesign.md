# aNode API 体系设计

## API 设计理念

基于对 ZeroDev paymaster 接口的深入分析，aNode API 体系采用以下设计原则：
1. **完全兼容 ZeroDev**：支持现有 ZeroDev 客户端无缝迁移
2. **扩展增强**：添加 SBT、PNT、安全过滤等独有功能
3. **RESTful 设计**：标准化的 HTTP 接口
4. **错误标准化**：统一的错误响应格式
5. **向后兼容**：API 版本控制，保证升级平滑

## 核心 API 架构

### 1. ZeroDev 兼容层 API

#### 1.1 Gas 赞助接口（完全兼容 ZeroDev）

**POST /api/v1/paymaster/sponsor**
```http
POST /api/v1/paymaster/sponsor
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "userOperation": {
    "sender": "0x742d35Cc6634C0532925a3b8D2C8f93c2b8D8f93c2",
    "nonce": "0x0",
    "initCode": "0x",
    "callData": "0x...",
    "callGasLimit": "0x186a0",
    "verificationGasLimit": "0x186a0", 
    "preVerificationGas": "0x5208",
    "maxFeePerGas": "0x4a817c800",
    "maxPriorityFeePerGas": "0x3b9aca00",
    "paymasterAndData": "0x",
    "signature": "0x..."
  },
  "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  "chainId": 1,
  "context": {
    "type": "sponsor"
  }
}
```

**成功响应：**
```json
{
  "paymasterAndData": "0x1234567890abcdef...",
  "preVerificationGas": "0x5208",
  "verificationGasLimit": "0x186a0",
  "callGasLimit": "0x186a0",
  "maxFeePerGas": "0x4a817c800",
  "maxPriorityFeePerGas": "0x3b9aca00"
}
```

#### 1.2 ERC20 Gas 支付接口（兼容 ZeroDev）

**POST /api/v1/paymaster/erc20**
```http
POST /api/v1/paymaster/erc20
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "userOperation": { ... },
  "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  "chainId": 1,
  "context": {
    "type": "erc20",
    "token": "0xA0b86a33E6441c8C0c45F2d7a6c6e5B8E6A8C8D2",
    "maxTokenAmount": "1000000"
  }
}
```

#### 1.3 Gas 估算接口（兼容 ZeroDev）

**POST /api/v1/paymaster/estimate**
```http
POST /api/v1/paymaster/estimate
Content-Type: application/json

{
  "userOperation": { ... },
  "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  "chainId": 1,
  "context": {
    "token": "0xA0b86a33E6441c8C0c45F2d7a6c6e5B8E6A8C8D2" // 可选
  }
}
```

**响应：**
```json
{
  "gasEstimate": {
    "callGasLimit": "0x186a0",
    "verificationGasLimit": "0x186a0",
    "preVerificationGas": "0x5208",
    "maxFeePerGas": "0x4a817c800",
    "maxPriorityFeePerGas": "0x3b9aca00",
    "totalGasCost": "0x2386f26fc10000",
    "tokenAmount": "5000000" // 如果指定了 token
  }
}
```

### 2. aNode 扩展 API

#### 2.1 SBT 验证接口

**GET /api/v1/validation/sbt/{address}**
```http
GET /api/v1/validation/sbt/0x742d35Cc6634C0532925a3b8D2C8f93c2b8D8f93c2
```

**响应：**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D2C8f93c2b8D8f93c2",
  "sbtValidation": {
    "isValid": true,
    "sbtTokens": [
      {
        "contract": "0x1234...SBT1",
        "tokenId": "123",
        "type": "identity",
        "issuedAt": "2024-01-15T10:30:00Z",
        "expiresAt": null,
        "metadata": {
          "name": "Verified Identity",
          "level": "basic"
        }
      },
      {
        "contract": "0x5678...SBT2", 
        "tokenId": "456",
        "type": "reputation",
        "issuedAt": "2024-02-01T15:45:00Z",
        "expiresAt": null,
        "metadata": {
          "score": 850,
          "category": "defi_user"
        }
      }
    ],
    "requiredTypes": ["identity"],
    "missingTypes": []
  }
}
```

**验证失败响应：**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D2C8f93c2b8D8f93c2",
  "sbtValidation": {
    "isValid": false,
    "sbtTokens": [],
    "requiredTypes": ["identity", "reputation"],
    "missingTypes": ["identity", "reputation"],
    "error": {
      "code": "ANODE_001_SBT_NOT_FOUND",
      "message": "Required SBT tokens not found",
      "suggestions": [
        "Obtain identity verification SBT from authorized issuer",
        "Build reputation through platform interactions"
      ]
    }
  }
}
```

#### 2.2 PNT 余额验证接口

**GET /api/v1/validation/pnt/{address}**
```http
GET /api/v1/validation/pnt/0x742d35Cc6634C0532925a3b8D2C8f93c2b8D8f93c2
```

**响应：**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D2C8f93c2b8D8f93c2",
  "pntValidation": {
    "isValid": true,
    "balance": {
      "available": "250000000000000000000", // 250 PNT
      "staked": "100000000000000000000",    // 100 PNT
      "locked": "50000000000000000000",     // 50 PNT
      "total": "400000000000000000000"      // 400 PNT
    },
    "requirements": {
      "minRequired": "100000000000000000000", // 100 PNT
      "satisfied": true
    },
    "stakingInfo": {
      "stakingContract": "0xabcd...STAKE",
      "stakingPeriod": "30 days",
      "rewards": "5000000000000000000" // 5 PNT
    }
  }
}
```

#### 2.3 安全风险评估接口

**POST /api/v1/security/assess**
```http
POST /api/v1/security/assess
Content-Type: application/json

{
  "userOperation": { ... },
  "analysisDepth": "deep", // "basic" | "standard" | "deep"
  "includeRecommendations": true
}
```

**响应：**
```json
{
  "securityAssessment": {
    "riskLevel": "medium",
    "riskScore": 65, // 0-100
    "targetContract": {
      "address": "0x1234...CONTRACT",
      "isVerified": false,
      "deploymentAge": "2 hours",
      "codeHash": "0xabcd...",
      "similarContracts": [
        {
          "address": "0x5678...SIMILAR",
          "similarity": 0.85,
          "riskHistory": ["rug_pull_reported"]
        }
      ]
    },
    "riskFactors": [
      {
        "type": "unverified_contract",
        "severity": "medium",
        "description": "Target contract source code is not verified",
        "weight": 30
      },
      {
        "type": "recent_deployment", 
        "severity": "low",
        "description": "Contract deployed less than 24 hours ago",
        "weight": 15
      },
      {
        "type": "high_value_transaction",
        "severity": "medium", 
        "description": "Transaction value exceeds normal patterns",
        "weight": 20
      }
    ],
    "recommendations": [
      "Wait for contract verification before proceeding",
      "Reduce transaction amount for initial interaction",
      "Check community discussions about this contract"
    ],
    "externalSources": [
      {
        "provider": "chainabuse",
        "status": "clean",
        "lastChecked": "2024-03-15T10:30:00Z"
      },
      {
        "provider": "forta",
        "alerts": [],
        "lastChecked": "2024-03-15T10:30:00Z"
      }
    ]
  }
}
```

#### 2.4 综合处理接口（aNode 核心）

**POST /api/v1/paymaster/process**
```http
POST /api/v1/paymaster/process
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "userOperation": { ... },
  "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  "chainId": 1,
  "context": {
    "type": "sponsor", // "sponsor" | "erc20" | "custom"
    "token": "0x...", // 仅当 type = "erc20" 时
    "skipSecurity": false, // 是否跳过安全检查
    "confirmationToken": null // 二次确认时提供
  }
}
```

**成功响应：**
```json
{
  "success": true,
  "userOperation": {
    // 处理后的 UserOperation，包含 paymasterAndData
  },
  "processing": {
    "modules": [
      {
        "name": "sbt_validator",
        "status": "passed",
        "duration": "12ms"
      },
      {
        "name": "pnt_balance_validator", 
        "status": "passed",
        "duration": "8ms"
      },
      {
        "name": "security_filter",
        "status": "passed", 
        "duration": "45ms"
      },
      {
        "name": "paymaster_signer",
        "status": "passed",
        "duration": "15ms"
      }
    ],
    "totalDuration": "80ms"
  },
  "gasEstimate": {
    "totalCost": "0x2386f26fc10000",
    "breakdown": {
      "callGas": "0x186a0",
      "verificationGas": "0x186a0", 
      "preVerificationGas": "0x5208"
    }
  }
}
```

**需要确认的响应：**
```json
{
  "success": false,
  "requiresConfirmation": true,
  "confirmationToken": "confirm_abc123def456",
  "securityWarning": {
    "level": "warning", // "info" | "warning" | "critical"
    "title": "Potential Risk Detected",
    "message": "The target contract has not been verified and was deployed recently",
    "riskScore": 65,
    "riskFactors": [
      "Unverified contract source code",
      "Deployed less than 24 hours ago",
      "Similar contracts have risk history"
    ],
    "recommendations": [
      "Wait for contract verification",
      "Reduce transaction amount",
      "Seek community feedback"
    ],
    "actions": {
      "proceed": {
        "endpoint": "/api/v1/paymaster/process",
        "method": "POST",
        "body": "Same request with confirmationToken"
      },
      "cancel": {
        "message": "Transaction cancelled for security reasons"
      }
    }
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "error": {
    "code": "ANODE_002_INSUFFICIENT_PNT_BALANCE",
    "message": "Insufficient PNT token balance",
    "details": {
      "required": "100000000000000000000",
      "available": "50000000000000000000",
      "shortfall": "50000000000000000000"
    },
    "suggestions": [
      "Acquire more PNT tokens",
      "Stake existing tokens to increase effective balance",
      "Use a different wallet with sufficient PNT balance"
    ],
    "retryable": false
  }
}
```

### 3. 策略管理 API

#### 3.1 Gas 策略配置

**GET /api/v1/policies/gas**
```http
GET /api/v1/policies/gas
Authorization: Bearer <ADMIN_API_KEY>
```

**POST /api/v1/policies/gas**
```http
POST /api/v1/policies/gas
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>

{
  "name": "Daily Spending Limit",
  "type": "project", // "project" | "contract" | "wallet" | "custom"
  "target": null, // 仅当 type != "project" 时
  "rateLimits": [
    {
      "type": "amount", // "amount" | "request" | "gasPrice" | "amountPerTransaction"
      "limit": "1000000000000000000", // 1 ETH in wei
      "window": 86400, // 24 hours in seconds
      "enabled": true
    }
  ],
  "enabled": true,
  "metadata": {
    "description": "Limit daily gas spending to 1 ETH",
    "createdBy": "admin",
    "tags": ["daily", "spending", "limit"]
  }
}
```

#### 3.2 策略状态查询

**GET /api/v1/policies/{policyId}/status**
```http
GET /api/v1/policies/policy_123/status?wallet=0x742d35Cc&contract=0x1234
```

**响应：**
```json
{
  "policyId": "policy_123",
  "name": "Daily Spending Limit",
  "enabled": true,
  "currentUsage": [
    {
      "limitType": "amount",
      "limit": "1000000000000000000",
      "used": "250000000000000000",
      "remaining": "750000000000000000",
      "window": {
        "duration": 86400,
        "startTime": "2024-03-15T00:00:00Z",
        "endTime": "2024-03-16T00:00:00Z"
      },
      "utilizationPercentage": 25
    }
  ],
  "recentViolations": [],
  "nextReset": "2024-03-16T00:00:00Z"
}
```

### 4. 监控和统计 API

#### 4.1 健康检查

**GET /api/v1/health**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 86400,
  "components": {
    "paymaster": {
      "status": "healthy",
      "lastCheck": "2024-03-15T10:30:00Z"
    },
    "blockchain": {
      "ethereum": "connected",
      "polygon": "connected", 
      "base": "connected"
    },
    "database": {
      "status": "connected",
      "responseTime": "5ms"
    },
    "cache": {
      "status": "connected",
      "hitRate": 0.85
    }
  }
}
```

#### 4.2 操作统计

**GET /api/v1/metrics**
```json
{
  "timeRange": {
    "start": "2024-03-14T00:00:00Z",
    "end": "2024-03-15T00:00:00Z"
  },
  "operations": {
    "totalProcessed": 1542,
    "successful": 1456,
    "failed": 86,
    "successRate": 0.944
  },
  "gasSponsorship": {
    "totalGasSponsored": "15420000000000000000", // 15.42 ETH
    "operationsSponsored": 1234,
    "averageGasPerOperation": "12500000000000000" // 0.0125 ETH
  },
  "validation": {
    "sbtValidation": {
      "passed": 1456,
      "failed": 86,
      "passRate": 0.944
    },
    "pntValidation": {
      "passed": 1542,
      "failed": 0,
      "passRate": 1.0
    },
    "securityFiltering": {
      "safe": 1200,
      "warning": 256,
      "blocked": 86,
      "confirmationRate": 0.75 // warning 中确认继续的比例
    }
  },
  "performance": {
    "averageProcessingTime": "125ms",
    "moduleBreakdown": {
      "sbtValidator": "15ms",
      "pntValidator": "8ms", 
      "securityFilter": "45ms",
      "paymasterSigner": "12ms"
    }
  }
}
```

### 5. 配置管理 API

#### 5.1 模块配置

**GET /api/v1/config/modules**
**PUT /api/v1/config/modules**
```json
{
  "modules": {
    "sbtValidator": {
      "enabled": true,
      "config": {
        "supportedContracts": [
          "0x1234...SBT1",
          "0x5678...SBT2"
        ],
        "requiredTypes": ["identity"],
        "cacheTimeout": 300
      }
    },
    "pntValidator": {
      "enabled": true,
      "config": {
        "contractAddress": "0xabcd...PNT",
        "minBalance": "100000000000000000000",
        "includeStaked": true
      }
    },
    "securityFilter": {
      "enabled": true,
      "config": {
        "riskThreshold": 70,
        "providers": ["chainabuse", "forta"],
        "blacklistContracts": [
          "0xbad1...SCAM"
        ]
      }
    }
  }
}
```

### 6. 错误代码标准化

#### 6.1 ERC-4337 标准错误
- `AA10` - `AA99`: 遵循 ERC-4337 标准错误代码

#### 6.2 aNode 扩展错误
- `ANODE_001_SBT_NOT_FOUND`: 未找到所需的 SBT
- `ANODE_002_INSUFFICIENT_PNT_BALANCE`: PNT 余额不足
- `ANODE_003_SECURITY_WARNING`: 安全风险警告
- `ANODE_004_SECURITY_BLOCKED`: 安全风险阻止
- `ANODE_005_RATE_LIMIT_EXCEEDED`: 超出速率限制
- `ANODE_006_POLICY_VIOLATION`: 策略违规
- `ANODE_007_MODULE_DISABLED`: 模块已禁用
- `ANODE_008_INVALID_CONFIRMATION_TOKEN`: 无效的确认令牌
- `ANODE_009_CONFIRMATION_EXPIRED`: 确认已过期
- `ANODE_010_UNSUPPORTED_CHAIN`: 不支持的链

### 7. API 版本控制

#### 7.1 版本策略
- **v1**: 当前稳定版本
- **v2**: 下一个主要版本（预留）
- 向后兼容策略：至少支持两个主要版本

#### 7.2 版本头
```http
Accept: application/json; version=1
API-Version: 1
```

### 8. 多协议支持

#### 8.1 RESTful API（主要）
当前的 RESTful 接口设计，使用标准的 HTTP 方法和状态码。

#### 8.2 JSON-RPC 2.0 支持

**统一 JSON-RPC 端点：**
```http
POST /api/v1/rpc
Content-Type: application/json
```

**方法映射：**
```json
{
  "jsonrpc": "2.0",
  "method": "anode_sponsorUserOperation",
  "params": {
    "userOperation": { ... },
    "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    "chainId": 1,
    "context": { "type": "sponsor" }
  },
  "id": 1
}
```

**JSON-RPC 方法列表：**
- `anode_sponsorUserOperation` - Gas 赞助
- `anode_payWithERC20` - ERC20 支付
- `anode_estimateGas` - Gas 估算
- `anode_processUserOperation` - 综合处理
- `anode_validateSBT` - SBT 验证
- `anode_validatePNT` - PNT 验证
- `anode_assessSecurity` - 安全评估
- `anode_getPolicies` - 获取策略
- `anode_createPolicy` - 创建策略
- `anode_updatePolicy` - 更新策略
- `anode_deletePolicy` - 删除策略
- `anode_getPolicyStatus` - 策略状态

**JSON-RPC 错误响应：**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "ANODE_002_INSUFFICIENT_PNT_BALANCE",
    "data": {
      "required": "100000000000000000000",
      "available": "50000000000000000000",
      "shortfall": "50000000000000000000"
    }
  },
  "id": 1
}
```

#### 8.3 未来协议支持预留

**gRPC/Protocol Buffers 预留接口：**
```proto
// 预留的 Protocol Buffers 定义
syntax = "proto3";
package anode.v1;

service aNodePaymaster {
  rpc SponsorUserOperation(SponsorRequest) returns (SponsorResponse);
  rpc ProcessUserOperation(ProcessRequest) returns (ProcessResponse);
}

message SponsorRequest {
  UserOperation user_operation = 1;
  string entry_point = 2;
  uint64 chain_id = 3;
  SponsorContext context = 4;
}
```

**协议选择策略：**
- **RESTful**: Web 前端、简单集成
- **JSON-RPC**: 区块链客户端、批量操作
- **gRPC**: 高性能微服务、内部通信（未来）

### 9. 认证和授权

#### 9.1 API Key 认证
```http
Authorization: Bearer <API_KEY>
```

#### 9.2 权限级别
- **PUBLIC**: 只读查询接口
- **OPERATOR**: 处理用户操作
- **ADMIN**: 配置和策略管理
- **SYSTEM**: 内部系统调用

#### 9.3 协议级认证
- **RESTful**: HTTP Bearer Token
- **JSON-RPC**: 在 params 中包含认证信息
- **gRPC**: Metadata 中的认证头（未来）

### 10. 客户端 SDK 设计

#### 10.1 TypeScript SDK
```typescript
// RESTful 客户端
class aNodeRestClient {
  async sponsorUserOperation(request: SponsorRequest): Promise<PaymasterResult> {
    return this.post('/api/v1/paymaster/sponsor', request);
  }
}

// JSON-RPC 客户端  
class aNodeRpcClient {
  async sponsorUserOperation(params: SponsorParams): Promise<PaymasterResult> {
    return this.call('anode_sponsorUserOperation', params);
  }
}

// 统一客户端
class aNodeClient {
  constructor(
    private config: {
      baseUrl: string;
      apiKey: string;
      protocol: 'rest' | 'jsonrpc';
    }
  ) {
    this.client = config.protocol === 'rest' 
      ? new aNodeRestClient(config)
      : new aNodeRpcClient(config);
  }
}
```

这个 API 设计完全兼容 ZeroDev 的接口，同时扩展了 aNode 的特有功能，支持 RESTful 和 JSON-RPC 两种协议，为模块化架构提供了完整的 API 支持，并为未来的 gRPC 扩展预留了接口。
