use crate::core::types::*;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use tracing::{info, warn, error};

/// Gas estimation service for calculating gas costs and token conversions
pub struct GasEstimatorService {
    http_client: Client,
    price_feeds: HashMap<String, String>, // Token address -> price feed URL
}

impl GasEstimatorService {
    pub fn new() -> Self {
        let mut price_feeds = HashMap::new();
        
        // Add popular token price feeds (using CoinGecko as example)
        price_feeds.insert(
            "0xA0b86a33E6441c8C0c45F2d7a6c6e5B8E6A8C8D2".to_lowercase(), // USDC
            "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd".to_string()
        );
        price_feeds.insert(
            "0xdAC17F958D2ee523a2206206994597C13D831ec7".to_lowercase(), // USDT
            "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd".to_string()
        );

        Self {
            http_client: Client::new(),
            price_feeds,
        }
    }

    /// Estimate gas costs for a user operation
    pub async fn estimate_gas(&self, request: &GasEstimateRequest) -> PaymasterResult<GasEstimate> {
        info!("Estimating gas for user operation");

        // Calculate total gas limit
        let call_gas_limit: u64 = request.user_operation.call_gas_limit.parse()
            .map_err(|_| PaymasterError::GasEstimationFailed("Invalid call gas limit".to_string()))?;
        
        let verification_gas_limit: u64 = request.user_operation.verification_gas_limit.parse()
            .map_err(|_| PaymasterError::GasEstimationFailed("Invalid verification gas limit".to_string()))?;
        
        let pre_verification_gas: u64 = request.user_operation.pre_verification_gas.parse()
            .map_err(|_| PaymasterError::GasEstimationFailed("Invalid pre verification gas".to_string()))?;

        let total_gas_limit = call_gas_limit + verification_gas_limit + pre_verification_gas;

        // Get current gas price
        let gas_price = self.get_current_gas_price().await?;

        // Calculate total cost in ETH (wei)
        let total_cost_wei = total_gas_limit * gas_price;

        // Convert to token amount if requested
        let total_cost_token = if let Some(token) = &request.token {
            Some(self.convert_eth_to_token(total_cost_wei, token).await?)
        } else {
            None
        };

        let estimate = GasEstimate {
            total_gas_limit: total_gas_limit.to_string(),
            gas_price: gas_price.to_string(),
            total_cost_eth: total_cost_wei.to_string(),
            total_cost_token: total_cost_token.map(|amount| amount.to_string()),
        };

        info!("Gas estimation completed: {} gas at {} wei/gas", total_gas_limit, gas_price);
        Ok(estimate)
    }

    /// Get current gas price from network
    async fn get_current_gas_price(&self) -> PaymasterResult<u64> {
        // This would integrate with gas price oracles like:
        // - EthGasStation
        // - Blocknative
        // - Alchemy Gas API
        // - Direct blockchain RPC calls

        // For now, return a reasonable default (20 gwei)
        let gas_price = 20_000_000_000u64; // 20 gwei in wei
        
        info!("Current gas price: {} wei", gas_price);
        Ok(gas_price)
    }

    /// Convert ETH amount to token amount
    async fn convert_eth_to_token(&self, eth_amount_wei: u64, token_address: &str) -> PaymasterResult<u64> {
        let token_key = token_address.to_lowercase();
        
        if !self.price_feeds.contains_key(&token_key) {
            return Err(PaymasterError::GasEstimationFailed(
                format!("No price feed available for token: {}", token_address)
            ));
        }

        // Get ETH price in USD
        let eth_price_usd = self.get_eth_price_usd().await?;
        
        // Get token price in USD
        let token_price_usd = self.get_token_price_usd(&token_key).await?;

        // Convert ETH amount to USD
        let eth_amount_eth = eth_amount_wei as f64 / 1e18; // Convert wei to ETH
        let usd_amount = eth_amount_eth * eth_price_usd;

        // Convert USD to token amount
        let token_amount = usd_amount / token_price_usd;

        // Apply token decimals (assuming 6 for USDC/USDT, 18 for others)
        let decimals = self.get_token_decimals(&token_key);
        let token_amount_with_decimals = (token_amount * (10f64.powi(decimals as i32))) as u64;

        info!("Converted {} wei ETH to {} tokens", eth_amount_wei, token_amount_with_decimals);
        Ok(token_amount_with_decimals)
    }

    /// Get ETH price in USD
    async fn get_eth_price_usd(&self) -> PaymasterResult<f64> {
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
        
        let response = self.http_client.get(url)
            .send()
            .await
            .map_err(|e| PaymasterError::GasEstimationFailed(format!("Price API request failed: {}", e)))?;

        let json: Value = response.json().await
            .map_err(|e| PaymasterError::GasEstimationFailed(format!("Price API response parse failed: {}", e)))?;

        let eth_price = json["ethereum"]["usd"].as_f64()
            .ok_or_else(|| PaymasterError::GasEstimationFailed("Invalid ETH price response".to_string()))?;

        info!("ETH price: ${}", eth_price);
        Ok(eth_price)
    }

    /// Get token price in USD
    async fn get_token_price_usd(&self, token_key: &str) -> PaymasterResult<f64> {
        let price_feed_url = self.price_feeds.get(token_key)
            .ok_or_else(|| PaymasterError::GasEstimationFailed("Price feed not found".to_string()))?;

        let response = self.http_client.get(price_feed_url)
            .send()
            .await
            .map_err(|e| PaymasterError::GasEstimationFailed(format!("Token price API request failed: {}", e)))?;

        let json: Value = response.json().await
            .map_err(|e| PaymasterError::GasEstimationFailed(format!("Token price API response parse failed: {}", e)))?;

        // This is simplified - would need to handle different API response formats
        let token_price = if token_key.contains("A0b86a33E6441c8C0c45F2d7a6c6e5B8E6A8C8D2") {
            // USDC
            json["usd-coin"]["usd"].as_f64().unwrap_or(1.0)
        } else if token_key.contains("dAC17F958D2ee523a2206206994597C13D831ec7") {
            // USDT
            json["tether"]["usd"].as_f64().unwrap_or(1.0)
        } else {
            1.0 // Default for unknown tokens
        };

        info!("Token {} price: ${}", token_key, token_price);
        Ok(token_price)
    }

    /// Get token decimals
    fn get_token_decimals(&self, token_key: &str) -> u8 {
        // This would query the token contract for decimals
        // For now, return common values
        if token_key.contains("A0b86a33E6441c8C0c45F2d7a6c6e5B8E6A8C8D2") ||  // USDC
           token_key.contains("dAC17F958D2ee523a2206206994597C13D831ec7") {   // USDT
            6
        } else {
            18 // Default for most ERC20 tokens
        }
    }

    /// Estimate gas for batch transactions
    pub async fn estimate_batch_gas(&self, user_operations: &[UserOperation]) -> PaymasterResult<Vec<GasEstimate>> {
        let mut estimates = Vec::new();

        for user_op in user_operations {
            let request = GasEstimateRequest {
                user_operation: user_op.clone(),
                token: None,
            };
            
            let estimate = self.estimate_gas(&request).await?;
            estimates.push(estimate);
        }

        info!("Batch gas estimation completed for {} operations", user_operations.len());
        Ok(estimates)
    }

    /// Get gas price recommendations
    pub async fn get_gas_price_recommendations(&self) -> PaymasterResult<GasPriceRecommendations> {
        // This would integrate with gas price prediction services
        // For now, return static recommendations
        Ok(GasPriceRecommendations {
            slow: 15_000_000_000,    // 15 gwei
            standard: 20_000_000_000, // 20 gwei
            fast: 25_000_000_000,    // 25 gwei
            instant: 30_000_000_000, // 30 gwei
        })
    }

    /// Estimate gas for specific chain
    pub async fn estimate_gas_for_chain(&self, request: &GasEstimateRequest, chain_id: u64) -> PaymasterResult<GasEstimate> {
        // This would use chain-specific gas estimation logic
        // For now, use the same logic as the main estimate_gas method
        info!("Estimating gas for chain: {}", chain_id);
        self.estimate_gas(request).await
    }
}

#[derive(Debug)]
pub struct GasPriceRecommendations {
    pub slow: u64,     // wei per gas
    pub standard: u64, // wei per gas
    pub fast: u64,     // wei per gas
    pub instant: u64,  // wei per gas
}

impl Default for GasEstimatorService {
    fn default() -> Self {
        Self::new()
    }
}
