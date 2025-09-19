# aPaymaster Demo Application

A single-page React application for testing ERC-4337 UserOperations with the aPaymaster server.

## Features

- **Interactive UI**: Clean, modern interface for testing UserOperations
- **Configurable Parameters**: Customize all aspects of the UserOperation flow
- **Real-time Logging**: Detailed logs showing each step of the execution
- **Multiple Payment Modes**: Support for both sponsorship and ERC-20 token payments
- **Live Gas Estimation**: Automatic gas price fetching and estimation

## Getting Started

1. **Install dependencies:**
   ```bash
   cd app
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env.local`
   - Add your private key and API keys

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

## Configuration

The application supports the following configuration options:

- **Private Key**: Your wallet's private key (hex format)
- **Paymaster RPC URL**: URL for your aPaymaster server
- **Bundler RPC URL**: External bundler endpoint
- **Paymaster Contract**: Address of the deployed paymaster contract
- **Recipient Address**: Where to send test ETH transfers
- **Transfer Amount**: Amount of ETH to transfer
- **Payment Mode**: Choose between "sponsorship" or "erc20"
- **Token Address**: ERC-20 token address (for ERC-20 mode)
- **Sponsorship Policy**: Policy ID for sponsored operations

## Usage Flow

1. **Configure**: Set up all required parameters in the configuration panel
2. **Execute**: Click "Execute UserOperation" to start the process
3. **Monitor**: Watch real-time logs showing each step:
   - Client setup
   - Smart account creation
   - UserOperation preparation
   - Paymaster interaction
   - Gas estimation
   - Bundler submission
   - Transaction confirmation

## Log Levels

- **INFO**: General information and progress updates
- **SUCCESS**: Successful operations and confirmations
- **ERROR**: Failed operations with error details
- **WARNING**: Non-critical issues or warnings

## Architecture

The application demonstrates the complete ERC-4337 flow:

```
UserOperation Creation → Paymaster Sponsorship → Bundler Submission → On-Chain Execution
```

Built using:
- Next.js 14 with App Router
- React with TypeScript
- Tailwind CSS for styling
- permissionless.js for ERC-4337 interactions
- viem for Ethereum interactions

## Development

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

```env
# Private key for testing (use test accounts only!)
PRIVATE_KEY=0x...

# Pimlico API key for bundler/paymaster access
PIMLICO_API_KEY=your_api_key_here
```

## Security Notes

- Never use mainnet private keys
- Use test accounts and testnet tokens only
- The application is for educational/testing purposes
- Always verify transactions before execution
