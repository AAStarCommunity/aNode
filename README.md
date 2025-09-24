# aNode
aNode is a permissionless and public goods for community to support their own ERC-20 token for gas sponsor, useroperation security check and more feats.

- ERC-4337 bundler support (Pimlico, Alchemy, AAStar Rundler)
- ERC-20 PNTs and Community customized ERC-20 gas token support
- Self-running paymaster support with SuperPaymaster relay and contract(if you want publish your ERC-20 gas token)
- Entrypoint V06 support
- Entrypoint V07, V08 is working on (inlude EIP-7704, EOA delegation)

Just send me useroperation!

## Phase design
1. Phase 1: a off-chain **paymaster** signature node, working with on-chain contract.
  - sign after verify the useroperation and sender account SBT and PNTs balance
  - contract invoke by Entrypoint(validatePaymasterSignaure)
  - contract set and change different public key on-chain contract by owner
2. Phase 2: a passkey signature **validator**
  - invoked by outer aNode to verify it is user's will, returen a aNode BLS signature aggregation
  - if the BLS collection is enough, act as a sender, send to bundler RPC
  - will be changed for PQC
3. Phase 3: hardware dependent, **account manager** with TEE security guarantee
  - support web interface for account life management(many details)
  - support RPC API for KMS service
4. Phase 4: **Guardian** as social recovery and deadman's switch and more security service
  - join gourp weight for multi signature on creating AA account
  - verify special useroperation for changing the private key, by social verifications, not onchain
  - provide signature to confirm the special useroperation
  - the last guardian will submit to bundler if signature is enough
  - will change to Hash algorithm cause of Post Quantumn Computing


## On chain contract
We use pimlico singliton paymaster contract as initial version, thanks for their love and contribution.
It act as onchain deposit account to Entrypoint, and a manageable public key to verify off chain signature.
Entrypoint will invoke it's function to verify.
It must register to SuperPaymaster to join the OpenPNTs and OpenCards and more protocols to use infras.
We provide a 5-minutes guidance to do this.

## Off chain relay
We use Rust to develop a new simple version, you can deploy it to Cloudflare with almost zero cost.
We reference the Nodejs paymaster from ZeroDev, thanks for their contribution.
It act as a off chain signer(can rotate) after verifying their pre-setting rules(like only support specific contract, specific ERC-20 and more).

## Register on SuperPaymaster to run
This mechanism requires SuperPaymaster(include one contract and permissionless relays), which act as a register, a stake contract and smart router(relay do this).

## Documentation Structure

aNode maintains comprehensive documentation in the `docs/` directory:

### 📁 [docs/aNode-rust/](docs/aNode-rust/) - aNode Rust Implementation
Complete documentation for the aNode Rust paymaster service (Cloudflare Workers):

#### Core Architecture Documents
- **[aNodeFrameworkAndPaymasterModuleDesign.md](docs/aNode-rust/aNodeFrameworkAndPaymasterModuleDesign.md)** - Unified framework and paymaster module design, including ERC-4337 integration, modular architecture, and API interfaces
- **[aNodeRoadmap.md](docs/aNode-rust/aNodeRoadmap.md)** - Complete aNode development roadmap across 4 phases (Paymaster → Passkey Validator → Account Manager → Guardian System)
- **[aNodeArchitectureDesign.md](docs/aNode-rust/aNodeArchitectureDesign.md)** - Overall architecture design with pluggable modules and ZeroDev compatibility
- **[ArchitecturalAnalysis.md](docs/aNode-rust/ArchitecturalAnalysis.md)** - Senior architect's perspective on aNode system design analysis

#### Technical Implementation Documents
- **[aNodeAPIDesign.md](docs/aNode-rust/aNodeAPIDesign.md)** - Multi-protocol API design (RESTful + JSON-RPC) with comprehensive endpoint specifications
- **[aNodePolicySystem.md](docs/aNode-rust/aNodePolicySystem.md)** - Policy management system based on ZeroDev patterns with advanced rate limiting and rule engines
- **[SigningAndKeyManagement.md](docs/aNode-rust/SigningAndKeyManagement.md)** - Pluggable signing mechanisms supporting Local, AWS KMS, Cloudflare Secrets, and Keyless SSL
- **[ERC4337FlowDiagram.md](docs/aNode-rust/ERC4337FlowDiagram.md)** - Complete ERC-4337 flow integration with aNode enhancements
- **[ModuleDesign.md](docs/aNode-rust/ModuleDesign.md)** - Detailed module architecture with internal call sequence diagrams

#### Development Guides
- **[dev-guide.md](docs/aNode-rust/dev-guide.md)** - Comprehensive development guide with dual-version strategy, API specifications, and deployment instructions
- **[rust-cloudflare.md](docs/aNode-rust/rust-cloudflare.md)** - Complete guide for Rust Cloudflare Workers development, deployment, and testing
- **[RustWorkerCompatibility.md](docs/aNode-rust/RustWorkerCompatibility.md)** - Analysis of Rust Cloudflare Worker compatibility issues and solutions
- **[account-abstraction-reference.md](docs/aNode-rust/account-abstraction-reference.md)** - Official ERC-4337 implementation reference with EntryPoint, paymaster, and stake system details
- **[ultra-relay-paymaster-integration.md](docs/aNode-rust/ultra-relay-paymaster-integration.md)** - Analysis of how Ultra-Relay integrates paymaster capabilities into bundler
- **[bundler-architecture-knowledge.md](docs/aNode-rust/bundler-architecture-knowledge.md)** - Comprehensive bundler architecture guide based on Alto/Ultra-Relay analysis

### 📁 docs/ - Web Application & General Documentation
Documentation for web application and general project information:

- **[ALCHEMY_ACCOUNT_KIT_LEARNING.md](docs/ALCHEMY_ACCOUNT_KIT_LEARNING.md)** - Alchemy Account Kit integration learning and examples
- **[DEPLOY.md](docs/DEPLOY.md)** - Web application deployment guide
- **[TEST_REPORT.md](docs/TEST_REPORT.md)** - Testing reports and Playwright test results
- **[DetailedSystemDesign.md](docs/DetailedSystemDesign.md)** - Detailed system design specifications
- **[ERC4337-AB-Test-Guide.md](docs/ERC4337-AB-Test-Guide.md)** - ERC-4337 Account Abstraction testing guide
- **[setup-guide.md](docs/setup-guide.md)** - Development environment setup guide
- **[README-test-accounts.md](docs/README-test-accounts.md)** - Test accounts and configuration guide
- **[Changes.md](docs/Changes.md)** - Project change log and version history

## Live Demo

🚀 **aNode Paymaster Worker is now live on Cloudflare!**

**Production URL**: https://anode-js-worker.jhfnetboy.workers.dev

**Available Endpoints**:
- `GET /` - Service information and documentation
- `GET /health` - Health check endpoint
- `POST /api/v1/paymaster/sponsor` - Gas sponsorship endpoint
- `POST /api/v1/paymaster/process` - Full user operation processing with validation

**Test the live service**:
```bash
# Health check
curl https://anode-js-worker.jhfnetboy.workers.dev/health

# Process a user operation
curl -X POST https://anode-js-worker.jhfnetboy.workers.dev/api/v1/paymaster/process \
  -H "Content-Type: application/json"
```

### Worker Status

| Worker Type | Status | URL | Notes |
|-------------|--------|-----|-------|
| **JavaScript Worker** | ✅ **Live** | https://anode-js-worker.jhfnetboy.workers.dev | Full ERC-4337 paymaster API |
| **aNode Relay Server** | ✅ **Live** | https://anode-relay-server.jhfnetboy.workers.dev | aNode v0.01 - ERC-4337 Paymaster Service (Hello World) |
| **Rust Demo Worker** | 🗑️ **Removed** | N/A | Was: Hello World demo (cleaned up to save space) |

**Rust Worker 兼容性说明**:
- 当前 wrangler 版本: 4.38.0
- Worker crate 兼容性: 需要 wrangler 2.x 或 3.x 早期版本
- 建议解决方案: 使用 JavaScript Worker 或等待 Cloudflare 修复兼容性
- 代码位置: `cloudflare-worker/` 和 `cloudflare-rust-simple/`

## Quick Start

```bash
# Clone the repository
git clone https://github.com/AAStarCommunity/aNode.git
cd aNode

# Install dependencies for web app
cd web-app && pnpm install

# Start development server
pnpm run dev

# Test Cloudflare Worker locally
cd ../cloudflare-js-worker && wrangler dev --port 8788

# For Rust paymaster server (future)
cd ../relay-server && cargo build
```

## Contributing

1. Read the [aNode Roadmap](docs/aNodeRoadmap.md) to understand the project vision
2. Review [Module Design](docs/ModuleDesign.md) for architecture guidelines
3. Follow the [API Design](docs/aNodeAPIDesign.md) for interface specifications
4. Check [Policy System](docs/aNodePolicySystem.md) for configuration patterns

## License

This project is licensed under the MIT License. 


