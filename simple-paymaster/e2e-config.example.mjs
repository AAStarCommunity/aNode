// E2E Test Configuration Example
// Copy this file to e2e-config.mjs and fill in your values

export const config = {
  // Owner private key (the one that controls SimpleAccount A)
  OWNER_PRIVATE_KEY: process.env.OWNER_PRIVATE_KEY || "0x...your_private_key_here",
  
  // Paymaster private key (for signing paymaster data)
  PAYMASTER_PRIVATE_KEY: process.env.PAYMASTER_PRIVATE_KEY || "0x...your_paymaster_private_key_here",
  
  // Test addresses (provided by user)
  ENTRYPOINT_ADDRESS: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  SIMPLE_ACCOUNT_A: "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  SIMPLE_ACCOUNT_B: "0x27243FAc2c0bEf46F143a705708dC4A7eD476854", 
  PNT_TOKEN_ADDRESS: "0x3e7B771d4541eC85c8137e950598Ac97553a337a",
  
  // Service URLs
  PAYMASTER_URL: "http://localhost:8787",
  SEPOLIA_RPC: "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N",
}
