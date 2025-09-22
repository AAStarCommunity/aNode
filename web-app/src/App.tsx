import { useState, useEffect } from 'react';
import './App.css';

// Components
import NetworkSelector from './components/NetworkSelector';
import BundlerStatus from './components/BundlerStatus';
import GasCalculator from './components/GasCalculator';
import AccountManager from './components/AccountManager';
import TransferTest from './components/TransferTest';
import EnvConfigDisplay from './components/EnvConfigDisplay';
import MetaMaskWallet from './components/MetaMaskWallet';
import AccountDeployer from './components/AccountDeployer';
import BundlerSelector, { BundlerConfig } from './components/BundlerSelector';
import EntryPointSelector, { EntryPointConfig } from './components/EntryPointSelector';

// Services
import { BundlerService } from './services/bundlerService';
import { AlchemyBundlerService } from './services/alchemyBundlerService';
import { AccountService } from './services/accountService';
import { NETWORKS, DEFAULT_NETWORK } from './config/networks';
import { Network } from 'alchemy-sdk';

function App() {
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_NETWORK);
  const [selectedBundler, setSelectedBundler] = useState<BundlerConfig>({
    name: 'SuperRelay Rundler',
    type: 'rundler',
    url: 'https://rundler-superrelay.fly.dev',
    supportedEntryPoints: ['0.6'],
    description: '自部署的 Rundler 服务，支持 EntryPoint v0.6'
  });
  const [selectedEntryPoint, setSelectedEntryPoint] = useState<EntryPointConfig>({
    version: '0.6',
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    name: 'EntryPoint v0.6',
    description: 'ERC-4337 原始版本，广泛支持',
    supportedBundlers: ['rundler', 'alchemy']
  });
  const [bundlerService, setBundlerService] = useState<BundlerService | null>(null);
  const [alchemyBundlerService, setAlchemyBundlerService] = useState<AlchemyBundlerService | null>(null);
  const [accountService, setAccountService] = useState<AccountService | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [signer, setSigner] = useState<any>(null);

  // 初始化服务
  useEffect(() => {
    const network = NETWORKS[selectedNetwork];
    if (!network) {
      console.error('Network not found:', selectedNetwork);
      return;
    }

    console.log('初始化网络和Bundler:', selectedNetwork, network, selectedBundler, selectedEntryPoint);

    // 初始化 Bundler 服务
    if (selectedBundler.type === 'rundler') {
      if (network.bundlerUrl) {
        const bundler = new BundlerService(network.bundlerUrl);
        setBundlerService(bundler);
        setAlchemyBundlerService(null);
        console.log('Rundler 服务已初始化:', network.bundlerUrl);
      } else {
        console.warn('缺少 bundlerUrl 配置');
      }
    } else if (selectedBundler.type === 'alchemy') {
      if (network.alchemy?.apiKey) {
        // 获取 Alchemy 网络枚举
        const alchemyNetwork = getAlchemyNetwork(network.alchemy.network);
        const alchemy = new AlchemyBundlerService(
          network.alchemy.apiKey,
          alchemyNetwork,
          selectedEntryPoint.version
        );
        setAlchemyBundlerService(alchemy);
        setBundlerService(null);
        console.log('Alchemy Bundler 服务已初始化:', network.alchemy.network, selectedEntryPoint.version);
      } else {
        console.warn('缺少 Alchemy API Key 配置');
      }
    }

    // 初始化 Account 服务 (不需要私钥，将在运行时提供)
    const bundlerUrl = selectedBundler.type === 'rundler' ? network.bundlerUrl : '';
    if (bundlerUrl || selectedBundler.type === 'alchemy') {
      const account = new AccountService(
        network.rpcUrl,
        bundlerUrl || '',
        '', // 私钥将在执行时提供
        selectedEntryPoint.address,
        network.contracts.factory
      );
      setAccountService(account);
      console.log('Account 服务已初始化');
    }
  }, [selectedNetwork, selectedBundler, selectedEntryPoint]);

  // Bundler 变更处理
  const handleBundlerChange = (bundler: BundlerConfig) => {
    console.log('切换 Bundler:', bundler);
    setSelectedBundler(bundler);

    // 根据 bundler 类型自动调整 EntryPoint
    if (bundler.type === 'rundler' && selectedEntryPoint.version !== '0.6') {
      setSelectedEntryPoint({
        version: '0.6',
        address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        name: 'EntryPoint v0.6',
        description: 'ERC-4337 原始版本，广泛支持',
        supportedBundlers: ['rundler', 'alchemy']
      });
    }
  };

  // EntryPoint 变更处理
  const handleEntryPointChange = (entryPoint: EntryPointConfig) => {
    console.log('切换 EntryPoint:', entryPoint);
    setSelectedEntryPoint(entryPoint);
  };

  // 获取 Alchemy 网络枚举
  const getAlchemyNetwork = (networkName: string): Network => {
    const networkMap: Record<string, Network> = {
      'eth-sepolia': Network.ETH_SEPOLIA,
      'opt-sepolia': Network.OPT_SEPOLIA,
      'opt-mainnet': Network.OPT_MAINNET,
    };
    return networkMap[networkName] || Network.ETH_SEPOLIA;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>ERC-4337 Rundler Testing Interface</h1>
        <p>Comprehensive testing interface for Rundler bundler service</p>
        <div className="deployment-info">
          <span className="deployment-label">🚀 Build:</span>
          <span className="deployment-time">{import.meta.env.VITE_BUILD_TIME || new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
          <span className="deployment-label">📍 Env:</span>
          <span className="deployment-env">{import.meta.env.MODE}</span>
        </div>
        <div className="network-selector-container">
          <NetworkSelector
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
          />
        </div>
      </header>

      <main className="app-main">
        {/* MetaMask 钱包连接 */}
        <section className="wallet-section">
          <MetaMaskWallet
            onAccountChange={(account, signerInstance) => {
              setConnectedAccount(account);
              setSigner(signerInstance);
            }}
            onNetworkChange={(chainId) => {
              console.log('Network changed to:', chainId);
            }}
          />
        </section>

        {/* Bundler 选择器 */}
        <section className="bundler-section">
          <BundlerSelector
            selectedBundler={selectedBundler}
            onBundlerChange={handleBundlerChange}
          />
          <EntryPointSelector
            selectedEntryPoint={selectedEntryPoint}
            onEntryPointChange={handleEntryPointChange}
            bundlerType={selectedBundler.type}
          />
        </section>

        {/* 环境配置显示 */}
        <section className="config-section">
          <EnvConfigDisplay selectedNetwork={selectedNetwork} />
        </section>

        {/* 账户部署器 */}
        <section className="deployer-section">
          <AccountDeployer
            selectedNetwork={selectedNetwork}
            signer={signer}
            privateKey={import.meta.env.VITE_PRIVATE_KEY}
          />
        </section>

        {/* Bundler 状态 */}
        <section className="status-section">
          <BundlerStatus
            bundlerService={bundlerService}
            networkConfig={NETWORKS[selectedNetwork]}
          />
        </section>

        {/* Gas 计算器 */}
        <section className="gas-section">
          <GasCalculator
            bundlerService={bundlerService}
            networkConfig={NETWORKS[selectedNetwork]}
          />
        </section>

        {/* MetaMask 账户管理 */}
        {signer && (
          <section className="account-section">
            <div className="account-manager">
              <h3>📱 MetaMask Account Manager</h3>
              <div className="account-info">
                <p>连接的账户: {connectedAccount}</p>
                <p>可以使用 MetaMask 进行签名和交易</p>
              </div>
              <style jsx>{`
                .account-manager {
                  background: white;
                  border-radius: 12px;
                  padding: 24px;
                  margin: 16px 0;
                  border: 1px solid #e9ecef;
                }
                .account-info {
                  background: #f8f9fa;
                  padding: 16px;
                  border-radius: 8px;
                  font-family: monospace;
                }
              `}</style>
            </div>
          </section>
        )}

        {/* 原始账户管理 */}
        <section className="account-section">
          <AccountManager
            accountService={accountService}
            networkConfig={NETWORKS[selectedNetwork]}
          />
        </section>

        {/* 转账测试 */}
        <section className="transfer-section">
          <TransferTest
            accountService={accountService}
            bundlerService={bundlerService}
            networkConfig={NETWORKS[selectedNetwork]}
            signer={signer}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          🔗 Powered by{' '}
          <a
            href="https://rundler-superrelay.fly.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            SuperRelay Rundler
          </a>
          {' '} | Built with ERC-4337 EntryPoint v0.6
        </p>
      </footer>
    </div>
  );
}

export default App;
