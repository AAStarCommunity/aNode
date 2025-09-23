use crate::core::types::*;
use crate::config::Settings;
use ethers::prelude::*;
use std::sync::Arc;
use tracing::{info, warn, error};

/// Core paymaster service that handles gas sponsorship and ERC20 payments
pub struct PaymasterService {
    settings: Settings,
    ethereum_client: Arc<Provider<Http>>,
    signer: LocalWallet,
}

impl PaymasterService {
    pub async fn new(settings: Settings) -> PaymasterResult<Self> {
        // Initialize Ethereum client
        let provider = Provider::<Http>::try_from(&settings.blockchain.ethereum_rpc)
            .map_err(|e| PaymasterError::ConfigurationError(e.to_string()))?;
        
        // Initialize signer from private key
        let signer = settings.paymaster.private_key
            .parse::<LocalWallet>()
            .map_err(|e| PaymasterError::ConfigurationError(format!("Invalid private key: {}", e)))?;

        Ok(Self {
            settings,
            ethereum_client: Arc::new(provider),
            signer,
        })
    }

    /// Sponsor a user operation by generating paymaster signature
    pub async fn sponsor_user_operation(
        &self,
        request: &SponsorRequest,
    ) -> PaymasterResult<PaymasterResult> {
        info!("Sponsoring user operation for sender: {}", request.user_operation.sender);

        // Validate the user operation
        self.validate_user_operation(&request.user_operation).await?;

        // Check gas policies
        self.check_gas_policies(request).await?;

        // Generate paymaster signature
        let paymaster_and_data = self.generate_paymaster_signature(&request.user_operation).await?;

        // Calculate gas limits
        let gas_estimates = self.estimate_gas_limits(&request.user_operation).await?;

        Ok(PaymasterResult {
            paymaster_and_data,
            pre_verification_gas: gas_estimates.pre_verification_gas,
            verification_gas_limit: gas_estimates.verification_gas_limit,
            call_gas_limit: gas_estimates.call_gas_limit,
        })
    }

    /// Process ERC20 token payment for gas
    pub async fn process_erc20_payment(
        &self,
        request: &ERC20PaymentRequest,
    ) -> PaymasterResult<PaymasterResult> {
        info!("Processing ERC20 payment for token: {}", request.token);

        // Validate token is supported
        if !self.settings.paymaster.supported_tokens.contains(&request.token) {
            return Err(PaymasterError::InvalidUserOperation(
                format!("Token {} is not supported", request.token)
            ));
        }

        // Validate user operation
        self.validate_user_operation(&request.user_operation).await?;

        // Check token allowance
        self.check_token_allowance(&request.user_operation.sender, &request.token).await?;

        // Calculate token amount needed
        let token_amount = self.calculate_token_amount(&request.user_operation, &request.token).await?;

        // Verify user has enough tokens
        if token_amount > request.max_token_amount.parse::<u64>().unwrap_or(0) {
            return Err(PaymasterError::InsufficientBalance(
                format!("Required {} tokens, max allowed {}", token_amount, request.max_token_amount)
            ));
        }

        // Generate ERC20 paymaster signature
        let paymaster_and_data = self.generate_erc20_paymaster_signature(
            &request.user_operation,
            &request.token,
            token_amount,
        ).await?;

        let gas_estimates = self.estimate_gas_limits(&request.user_operation).await?;

        Ok(PaymasterResult {
            paymaster_and_data,
            pre_verification_gas: gas_estimates.pre_verification_gas,
            verification_gas_limit: gas_estimates.verification_gas_limit,
            call_gas_limit: gas_estimates.call_gas_limit,
        })
    }

    /// Validate user operation structure and signature
    async fn validate_user_operation(&self, user_op: &UserOperation) -> PaymasterResult<()> {
        // Basic validation
        if user_op.sender.is_empty() || user_op.call_data.is_empty() {
            return Err(PaymasterError::InvalidUserOperation(
                "Sender and call data are required".to_string()
            ));
        }

        // Validate sender is a contract or will be deployed
        let sender_address: Address = user_op.sender.parse()
            .map_err(|_| PaymasterError::InvalidUserOperation("Invalid sender address".to_string()))?;

        // Check if sender exists or has init code
        let code = self.ethereum_client.get_code(sender_address, None).await
            .map_err(|e| PaymasterError::BlockchainError(e.to_string()))?;

        if code.is_empty() && user_op.init_code.is_empty() {
            return Err(PaymasterError::InvalidUserOperation(
                "Sender must be deployed or have init code".to_string()
            ));
        }

        // Additional validation can be added here
        info!("User operation validation passed for sender: {}", user_op.sender);
        Ok(())
    }

    /// Check if operation violates any gas policies
    async fn check_gas_policies(&self, request: &SponsorRequest) -> PaymasterResult<()> {
        // This would integrate with the policy engine
        // For now, implement basic checks
        
        let gas_limit: u64 = request.user_operation.call_gas_limit.parse()
            .unwrap_or(0);
        
        // Example: Check if gas limit is reasonable
        if gas_limit > 10_000_000 {
            return Err(PaymasterError::PolicyViolation(
                "Gas limit exceeds maximum allowed".to_string()
            ));
        }

        info!("Gas policy checks passed for request");
        Ok(())
    }

    /// Generate paymaster signature for sponsored operation
    async fn generate_paymaster_signature(&self, user_op: &UserOperation) -> PaymasterResult<String> {
        // This is a simplified implementation
        // In production, this would involve proper signature generation
        let paymaster_address = &self.settings.paymaster.address;
        
        // Format: paymaster_address + signature_data
        let paymaster_and_data = format!("{}000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", paymaster_address);
        
        info!("Generated paymaster signature for user operation");
        Ok(paymaster_and_data)
    }

    /// Generate ERC20 paymaster signature
    async fn generate_erc20_paymaster_signature(
        &self,
        user_op: &UserOperation,
        token: &str,
        amount: u64,
    ) -> PaymasterResult<String> {
        // This would involve ERC20 paymaster contract interaction
        let paymaster_address = &self.settings.paymaster.address;
        
        // Include token address and amount in the signature data
        let paymaster_and_data = format!("{}{}{}",
            paymaster_address,
            token.trim_start_matches("0x"),
            format!("{:064x}", amount)
        );
        
        info!("Generated ERC20 paymaster signature for token: {}", token);
        Ok(paymaster_and_data)
    }

    /// Estimate gas limits for the operation
    async fn estimate_gas_limits(&self, user_op: &UserOperation) -> PaymasterResult<GasLimits> {
        // This would involve actual gas estimation
        // For now, return reasonable defaults
        Ok(GasLimits {
            pre_verification_gas: "21000".to_string(),
            verification_gas_limit: "100000".to_string(),
            call_gas_limit: user_op.call_gas_limit.clone(),
        })
    }

    /// Check token allowance for ERC20 payments
    async fn check_token_allowance(&self, sender: &str, token: &str) -> PaymasterResult<()> {
        // This would check the actual token allowance on-chain
        info!("Checking token allowance for sender: {} token: {}", sender, token);
        Ok(())
    }

    /// Calculate required token amount for gas payment
    async fn calculate_token_amount(&self, user_op: &UserOperation, token: &str) -> PaymasterResult<u64> {
        // This would involve:
        // 1. Estimating gas cost in ETH
        // 2. Converting ETH to token amount using price oracle
        // 3. Adding markup percentage
        
        let gas_limit: u64 = user_op.call_gas_limit.parse().unwrap_or(100000);
        let gas_price: u64 = user_op.max_fee_per_gas.parse().unwrap_or(20_000_000_000); // 20 gwei
        
        let gas_cost_wei = gas_limit * gas_price;
        
        // Simplified conversion (in production, use real price oracle)
        // Assume 1 ETH = 2000 USDC, 1 USDC = 1e6 (6 decimals)
        let token_amount = (gas_cost_wei / 1_000_000_000_000_000_000) * 2000 * 1_000_000;
        
        // Add markup
        let markup_multiplier = 1.0 + (self.settings.paymaster.gas_markup_percentage / 100.0);
        let final_amount = (token_amount as f64 * markup_multiplier) as u64;
        
        info!("Calculated token amount: {} for gas cost: {} wei", final_amount, gas_cost_wei);
        Ok(final_amount)
    }
}

#[derive(Debug)]
struct GasLimits {
    pub pre_verification_gas: String,
    pub verification_gas_limit: String,
    pub call_gas_limit: String,
}
