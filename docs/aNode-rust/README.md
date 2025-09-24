# aNode Rust Documentation

This directory contains all documentation related to the aNode Rust implementation - a Cloudflare Workers-based ERC-4337 paymaster service.

## 📚 Documentation Overview

### Core Architecture Documents
- **[aNodeFrameworkAndPaymasterModuleDesign.md](aNodeFrameworkAndPaymasterModuleDesign.md)** - Unified framework and paymaster module design, including ERC-4337 integration, modular architecture, and API interfaces
- **[aNodeRoadmap.md](aNodeRoadmap.md)** - Complete aNode development roadmap across 4 phases (Paymaster → Passkey Validator → Account Manager → Guardian System)
- **[aNodeArchitectureDesign.md](aNodeArchitectureDesign.md)** - Overall architecture design with pluggable modules and ZeroDev compatibility
- **[ArchitecturalAnalysis.md](ArchitecturalAnalysis.md)** - Senior architect's perspective on aNode system design analysis

### Technical Implementation Documents
- **[aNodeAPIDesign.md](aNodeAPIDesign.md)** - Multi-protocol API design (RESTful + JSON-RPC) with comprehensive endpoint specifications
- **[aNodePolicySystem.md](aNodePolicySystem.md)** - Policy management system based on ZeroDev patterns with advanced rate limiting and rule engines
- **[SigningAndKeyManagement.md](SigningAndKeyManagement.md)** - Pluggable signing mechanisms supporting Local, AWS KMS, Cloudflare Secrets, and Keyless SSL
- **[ERC4337FlowDiagram.md](ERC4337FlowDiagram.md)** - Complete ERC-4337 flow integration with aNode enhancements
- **[ModuleDesign.md](ModuleDesign.md)** - Detailed module architecture with internal call sequence diagrams

### Development Guides
- **[dev-guide.md](dev-guide.md)** - Comprehensive development guide with dual-version strategy, API specifications, and deployment instructions
- **[rust-cloudflare.md](rust-cloudflare.md)** - Complete guide for Rust Cloudflare Workers development, deployment, and testing
- **[RustWorkerCompatibility.md](RustWorkerCompatibility.md)** - Analysis of Rust Cloudflare Worker compatibility issues and solutions

## 🏗️ Current Development Status

### Active Services
- **JavaScript Worker**: https://anode-js-worker.jhfnetboy.workers.dev (Production ready)
- **Rust Relay Server**: https://anode-relay-server.jhfnetboy.workers.dev (v0.01 Hello World)

### Development Strategy
Following a **dual-version parallel development** approach:
1. **Phase 1**: Perfect JS Worker with real SBT/PNT/security validation
2. **Phase 2**: Rust version feature parity on Cloudflare Workers
3. **Phase 3**: Performance optimization and security hardening
4. **Phase 4**: JS version graceful retirement

## 🚀 Quick Start

```bash
# JS Worker (Production)
cd ../cloudflare-js-worker
npm install
npm run dev  # Local development
npm run deploy  # Production deployment

# Rust Worker (Development)
cd ../relay-server
cargo build --release --target wasm32-unknown-unknown
wrangler dev --port 8790  # Local development
wrangler deploy  # Production deployment
```

## 📖 Related Documentation

- [Main Project README](../../README.md) - Project overview and status
- [Web App Documentation](../) - Web application related docs in parent directory

## 🤝 Contributing

See [dev-guide.md](dev-guide.md) for detailed development guidelines and contribution standards.

---

*Last updated: September 2024*
