use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ERC-4337 UserOperation structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserOperation {
    pub sender: String,
    pub nonce: String,
    pub init_code: String,
    pub call_data: String,
    pub call_gas_limit: String,
    pub verification_gas_limit: String,
    pub pre_verification_gas: String,
    pub max_fee_per_gas: String,
    pub max_priority_fee_per_gas: String,
    pub paymaster_and_data: String,
    pub signature: String,
}

// Paymaster request/response types
#[derive(Debug, Serialize, Deserialize)]
pub struct SponsorRequest {
    pub user_operation: UserOperation,
    pub entry_point: String,
    pub chain_id: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymasterResult {
    pub paymaster_and_data: String,
    pub pre_verification_gas: String,
    pub verification_gas_limit: String,
    pub call_gas_limit: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ERC20PaymentRequest {
    pub user_operation: UserOperation,
    pub token: String,
    pub max_token_amount: String,
}

// Gas estimation types
#[derive(Debug, Serialize, Deserialize)]
pub struct GasEstimateRequest {
    pub user_operation: UserOperation,
    pub token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GasEstimate {
    pub total_gas_limit: String,
    pub gas_price: String,
    pub total_cost_eth: String,
    pub total_cost_token: Option<String>,
}

// Policy types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasPolicy {
    pub id: String,
    pub name: String,
    pub policy_type: PolicyType,
    pub target: Option<String>, // Contract address or wallet address
    pub rate_limits: Vec<RateLimit>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PolicyType {
    Project,
    Contract,
    Wallet,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimit {
    pub limit_type: RateLimitType,
    pub limit: String,
    pub window: u64, // Time window in seconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RateLimitType {
    Amount,
    Request,
    GasPrice,
    AmountPerTransaction,
}

// Chain configuration
#[derive(Debug, Clone)]
pub struct ChainConfig {
    pub chain_id: u64,
    pub name: String,
    pub rpc_url: String,
    pub entry_point: String,
    pub supported_tokens: HashMap<String, TokenConfig>,
}

#[derive(Debug, Clone)]
pub struct TokenConfig {
    pub address: String,
    pub symbol: String,
    pub decimals: u8,
    pub price_feed: String,
}

// Error types
#[derive(thiserror::Error, Debug)]
pub enum PaymasterError {
    #[error("Invalid user operation: {0}")]
    InvalidUserOperation(String),
    
    #[error("Policy violation: {0}")]
    PolicyViolation(String),
    
    #[error("Insufficient balance: {0}")]
    InsufficientBalance(String),
    
    #[error("Gas estimation failed: {0}")]
    GasEstimationFailed(String),
    
    #[error("Blockchain error: {0}")]
    BlockchainError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

pub type PaymasterResult<T> = Result<T, PaymasterError>;
