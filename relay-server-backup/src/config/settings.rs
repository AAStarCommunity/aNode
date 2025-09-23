use config::{Config, ConfigError, File};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub redis: RedisSettings,
    pub blockchain: BlockchainSettings,
    pub paymaster: PaymasterSettings,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerSettings {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseSettings {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Deserialize, Clone)]
pub struct RedisSettings {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Deserialize, Clone)]
pub struct BlockchainSettings {
    pub ethereum_rpc: String,
    pub polygon_rpc: String,
    pub base_rpc: String,
    pub arbitrum_rpc: String,
    pub entry_point: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PaymasterSettings {
    pub private_key: String,
    pub address: String,
    pub supported_tokens: Vec<String>,
    pub gas_markup_percentage: f64,
}

impl Settings {
    pub fn new() -> Result<Self, ConfigError> {
        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let s = Config::builder()
            .add_source(File::with_name("config/default"))
            .add_source(File::with_name(&format!("config/{}", run_mode)).required(false))
            .add_source(File::with_name("config/local").required(false))
            .add_source(config::Environment::with_prefix("APP"))
            .build()?;

        s.try_deserialize()
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            server: ServerSettings {
                host: "127.0.0.1".to_string(),
                port: 3000,
            },
            database: DatabaseSettings {
                url: "postgresql://postgres:password@localhost/paymaster".to_string(),
                max_connections: 10,
            },
            redis: RedisSettings {
                url: "redis://127.0.0.1:6379".to_string(),
                max_connections: 10,
            },
            blockchain: BlockchainSettings {
                ethereum_rpc: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY".to_string(),
                polygon_rpc: "https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY".to_string(),
                base_rpc: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY".to_string(),
                arbitrum_rpc: "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY".to_string(),
                entry_point: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789".to_string(),
            },
            paymaster: PaymasterSettings {
                private_key: "0x".to_string(),
                address: "0x".to_string(),
                supported_tokens: vec![
                    "0xA0b86a33E6441c8C0c45F2d7a6c6e5B8E6A8C8D2".to_string(), // USDC
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7".to_string(), // USDT
                ],
                gas_markup_percentage: 5.0,
            },
        }
    }
}
