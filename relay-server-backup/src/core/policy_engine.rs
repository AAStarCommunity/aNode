use crate::core::types::*;
use redis::AsyncCommands;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};

/// Policy engine for enforcing gas sponsorship policies
pub struct PolicyEngine {
    policies: Arc<RwLock<HashMap<String, GasPolicy>>>,
    redis_client: redis::Client,
}

impl PolicyEngine {
    pub fn new(redis_url: &str) -> PaymasterResult<Self> {
        let redis_client = redis::Client::open(redis_url)
            .map_err(|e| PaymasterError::ConfigurationError(format!("Redis connection failed: {}", e)))?;

        Ok(Self {
            policies: Arc::new(RwLock::new(HashMap::new())),
            redis_client,
        })
    }

    /// Add or update a gas policy
    pub async fn add_policy(&self, policy: GasPolicy) -> PaymasterResult<()> {
        let mut policies = self.policies.write().await;
        policies.insert(policy.id.clone(), policy.clone());
        
        info!("Added policy: {} of type: {:?}", policy.name, policy.policy_type);
        Ok(())
    }

    /// Remove a gas policy
    pub async fn remove_policy(&self, policy_id: &str) -> PaymasterResult<()> {
        let mut policies = self.policies.write().await;
        if policies.remove(policy_id).is_some() {
            info!("Removed policy: {}", policy_id);
            Ok(())
        } else {
            Err(PaymasterError::ConfigurationError(
                format!("Policy {} not found", policy_id)
            ))
        }
    }

    /// Check if a sponsor request violates any policies
    pub async fn check_policies(&self, request: &SponsorRequest) -> PaymasterResult<()> {
        let policies = self.policies.read().await;
        
        for policy in policies.values() {
            if !policy.enabled {
                continue;
            }

            match policy.policy_type {
                PolicyType::Project => {
                    self.check_project_policy(policy, request).await?;
                }
                PolicyType::Contract => {
                    if let Some(target) = &policy.target {
                        if self.request_targets_contract(request, target) {
                            self.check_contract_policy(policy, request).await?;
                        }
                    }
                }
                PolicyType::Wallet => {
                    if let Some(target) = &policy.target {
                        if request.user_operation.sender.eq_ignore_ascii_case(target) {
                            self.check_wallet_policy(policy, request).await?;
                        }
                    }
                }
                PolicyType::Custom => {
                    self.check_custom_policy(policy, request).await?;
                }
            }
        }

        info!("All policy checks passed for request");
        Ok(())
    }

    /// Check project-level policies
    async fn check_project_policy(&self, policy: &GasPolicy, request: &SponsorRequest) -> PaymasterResult<()> {
        for rate_limit in &policy.rate_limits {
            self.check_rate_limit(rate_limit, request, "project").await?;
        }
        Ok(())
    }

    /// Check contract-specific policies
    async fn check_contract_policy(&self, policy: &GasPolicy, request: &SponsorRequest) -> PaymasterResult<()> {
        let contract_key = policy.target.as_ref().unwrap();
        
        for rate_limit in &policy.rate_limits {
            self.check_rate_limit(rate_limit, request, contract_key).await?;
        }
        Ok(())
    }

    /// Check wallet-specific policies
    async fn check_wallet_policy(&self, policy: &GasPolicy, request: &SponsorRequest) -> PaymasterResult<()> {
        let wallet_key = &request.user_operation.sender;
        
        for rate_limit in &policy.rate_limits {
            self.check_rate_limit(rate_limit, request, wallet_key).await?;
        }
        Ok(())
    }

    /// Check custom policies (webhook-based)
    async fn check_custom_policy(&self, policy: &GasPolicy, request: &SponsorRequest) -> PaymasterResult<()> {
        // This would make HTTP calls to custom webhook endpoints
        // For now, implement a placeholder
        warn!("Custom policy check not implemented for policy: {}", policy.name);
        Ok(())
    }

    /// Check a specific rate limit
    async fn check_rate_limit(&self, rate_limit: &RateLimit, request: &SponsorRequest, key_prefix: &str) -> PaymasterResult<()> {
        let mut conn = self.redis_client.get_async_connection().await
            .map_err(|e| PaymasterError::DatabaseError(format!("Redis connection failed: {}", e)))?;

        match rate_limit.limit_type {
            RateLimitType::Amount => {
                self.check_amount_limit(&mut conn, rate_limit, request, key_prefix).await?;
            }
            RateLimitType::Request => {
                self.check_request_limit(&mut conn, rate_limit, request, key_prefix).await?;
            }
            RateLimitType::GasPrice => {
                self.check_gas_price_limit(rate_limit, request).await?;
            }
            RateLimitType::AmountPerTransaction => {
                self.check_amount_per_transaction_limit(rate_limit, request).await?;
            }
        }

        Ok(())
    }

    /// Check amount-based rate limit
    async fn check_amount_limit(
        &self,
        conn: &mut redis::aio::Connection,
        rate_limit: &RateLimit,
        request: &SponsorRequest,
        key_prefix: &str,
    ) -> PaymasterResult<()> {
        let window_key = format!("amount_limit:{}:{}", key_prefix, self.get_time_window(rate_limit.window));
        let current_amount: u64 = conn.get(&window_key).await.unwrap_or(0);
        
        let gas_cost = self.calculate_gas_cost(&request.user_operation)?;
        let limit: u64 = rate_limit.limit.parse()
            .map_err(|_| PaymasterError::ConfigurationError("Invalid amount limit".to_string()))?;

        if current_amount + gas_cost > limit {
            return Err(PaymasterError::PolicyViolation(
                format!("Amount limit exceeded: {} + {} > {}", current_amount, gas_cost, limit)
            ));
        }

        // Update the counter
        let _: () = conn.set_ex(&window_key, current_amount + gas_cost, rate_limit.window).await
            .map_err(|e| PaymasterError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Check request-based rate limit
    async fn check_request_limit(
        &self,
        conn: &mut redis::aio::Connection,
        rate_limit: &RateLimit,
        _request: &SponsorRequest,
        key_prefix: &str,
    ) -> PaymasterResult<()> {
        let window_key = format!("request_limit:{}:{}", key_prefix, self.get_time_window(rate_limit.window));
        let current_requests: u64 = conn.get(&window_key).await.unwrap_or(0);
        
        let limit: u64 = rate_limit.limit.parse()
            .map_err(|_| PaymasterError::ConfigurationError("Invalid request limit".to_string()))?;

        if current_requests >= limit {
            return Err(PaymasterError::PolicyViolation(
                format!("Request limit exceeded: {} >= {}", current_requests, limit)
            ));
        }

        // Increment the counter
        let _: () = conn.set_ex(&window_key, current_requests + 1, rate_limit.window).await
            .map_err(|e| PaymasterError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Check gas price limit
    async fn check_gas_price_limit(&self, rate_limit: &RateLimit, request: &SponsorRequest) -> PaymasterResult<()> {
        let max_fee_per_gas: u64 = request.user_operation.max_fee_per_gas.parse()
            .map_err(|_| PaymasterError::InvalidUserOperation("Invalid max fee per gas".to_string()))?;

        let limit: u64 = rate_limit.limit.parse()
            .map_err(|_| PaymasterError::ConfigurationError("Invalid gas price limit".to_string()))?;

        if max_fee_per_gas > limit {
            return Err(PaymasterError::PolicyViolation(
                format!("Gas price limit exceeded: {} > {}", max_fee_per_gas, limit)
            ));
        }

        Ok(())
    }

    /// Check amount per transaction limit
    async fn check_amount_per_transaction_limit(&self, rate_limit: &RateLimit, request: &SponsorRequest) -> PaymasterResult<()> {
        let gas_cost = self.calculate_gas_cost(&request.user_operation)?;
        let limit: u64 = rate_limit.limit.parse()
            .map_err(|_| PaymasterError::ConfigurationError("Invalid amount per transaction limit".to_string()))?;

        if gas_cost > limit {
            return Err(PaymasterError::PolicyViolation(
                format!("Amount per transaction limit exceeded: {} > {}", gas_cost, limit)
            ));
        }

        Ok(())
    }

    /// Calculate gas cost for a user operation
    fn calculate_gas_cost(&self, user_op: &UserOperation) -> PaymasterResult<u64> {
        let call_gas_limit: u64 = user_op.call_gas_limit.parse()
            .map_err(|_| PaymasterError::InvalidUserOperation("Invalid call gas limit".to_string()))?;
        
        let verification_gas_limit: u64 = user_op.verification_gas_limit.parse()
            .map_err(|_| PaymasterError::InvalidUserOperation("Invalid verification gas limit".to_string()))?;
        
        let pre_verification_gas: u64 = user_op.pre_verification_gas.parse()
            .map_err(|_| PaymasterError::InvalidUserOperation("Invalid pre verification gas".to_string()))?;
        
        let max_fee_per_gas: u64 = user_op.max_fee_per_gas.parse()
            .map_err(|_| PaymasterError::InvalidUserOperation("Invalid max fee per gas".to_string()))?;

        let total_gas = call_gas_limit + verification_gas_limit + pre_verification_gas;
        Ok(total_gas * max_fee_per_gas)
    }

    /// Get time window key for rate limiting
    fn get_time_window(&self, window_seconds: u64) -> u64 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        now / window_seconds
    }

    /// Check if request targets a specific contract
    fn request_targets_contract(&self, request: &SponsorRequest, contract_address: &str) -> bool {
        // This would analyze the call data to determine the target contract
        // For now, implement a simple check
        request.user_operation.call_data.contains(&contract_address.trim_start_matches("0x"))
    }

    /// Get policy status for monitoring
    pub async fn get_policy_status(&self, policy_id: &str) -> PaymasterResult<PolicyStatus> {
        let policies = self.policies.read().await;
        
        if let Some(policy) = policies.get(policy_id) {
            // This would include current usage statistics
            Ok(PolicyStatus {
                policy_id: policy_id.to_string(),
                enabled: policy.enabled,
                current_usage: self.get_current_usage(policy_id).await?,
            })
        } else {
            Err(PaymasterError::ConfigurationError(
                format!("Policy {} not found", policy_id)
            ))
        }
    }

    /// Get current usage statistics for a policy
    async fn get_current_usage(&self, policy_id: &str) -> PaymasterResult<HashMap<String, u64>> {
        // This would query Redis for current usage statistics
        let mut usage = HashMap::new();
        usage.insert("requests_this_hour".to_string(), 0);
        usage.insert("amount_spent_this_hour".to_string(), 0);
        Ok(usage)
    }
}

#[derive(Debug)]
pub struct PolicyStatus {
    pub policy_id: String,
    pub enabled: bool,
    pub current_usage: HashMap<String, u64>,
}
