import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface AccountDeployerProps {
  selectedNetwork: string;
  signer?: ethers.Signer;
  privateKey?: string;
}

interface DeploymentResult {
  accountA: string;
  accountB: string;
  txHashA?: string;
  txHashB?: string;
  deployed: boolean;
}

const SIMPLE_ACCOUNT_FACTORY_ABI = [
  "function createAccount(address owner, uint256 salt) public returns (address)",
  "function getAddress(address owner, uint256 salt) public view returns (address)"
];

const AccountDeployer: React.FC<AccountDeployerProps> = ({
  selectedNetwork,
  signer,
  privateKey
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('');
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [eoaBalance, setEoaBalance] = useState<string>('0');
  const [accountsStatus, setAccountsStatus] = useState<{
    accountA: { deployed: boolean; address: string };
    accountB: { deployed: boolean; address: string };
  } | null>(null);
  const [generatedAccounts, setGeneratedAccounts] = useState<{
    privateKey: string;
    eoaAddress: string;
    accountA: string;
    accountB: string;
  } | null>(null);

  const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "0x9406Cc6185a346906296840746125a0E44976454";
  const NODE_HTTP = import.meta.env.VITE_NODE_HTTP;
  const EOA_ADDRESS = import.meta.env.VITE_EOA_ADDRESS;
  const SIMPLE_ACCOUNT_A = import.meta.env.VITE_SIMPLE_ACCOUNT_A;
  const SIMPLE_ACCOUNT_B = import.meta.env.VITE_SIMPLE_ACCOUNT_B;

  useEffect(() => {
    checkAccountsStatus();
    loadEoaBalance();
  }, [selectedNetwork, signer, privateKey]);

  const loadEoaBalance = async () => {
    if (!NODE_HTTP || !EOA_ADDRESS) return;

    try {
      const provider = new ethers.JsonRpcProvider(NODE_HTTP);
      const balance = await provider.getBalance(EOA_ADDRESS);
      setEoaBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Failed to load EOA balance:', error);
    }
  };

  const checkAccountsStatus = async () => {
    if (!NODE_HTTP || !SIMPLE_ACCOUNT_A || !SIMPLE_ACCOUNT_B) return;

    try {
      const provider = new ethers.JsonRpcProvider(NODE_HTTP);

      const [codeA, codeB] = await Promise.all([
        provider.getCode(SIMPLE_ACCOUNT_A),
        provider.getCode(SIMPLE_ACCOUNT_B)
      ]);

      setAccountsStatus({
        accountA: {
          deployed: codeA !== "0x",
          address: SIMPLE_ACCOUNT_A
        },
        accountB: {
          deployed: codeB !== "0x",
          address: SIMPLE_ACCOUNT_B
        }
      });
    } catch (error) {
      console.error('Failed to check account status:', error);
    }
  };

  const generateNewAccounts = async () => {
    if (!NODE_HTTP) {
      setDeploymentStatus('❌ 缺少 RPC 连接配置');
      return;
    }

    try {
      setDeploymentStatus('🔧 生成新的测试账户...');

      const provider = new ethers.JsonRpcProvider(NODE_HTTP);
      const iface = new ethers.Interface(SIMPLE_ACCOUNT_FACTORY_ABI);

      let wallet;
      let useExistingEOA = false;

      // 检查是否使用现有的 .env 私钥
      if (EOA_ADDRESS && import.meta.env.VITE_PRIVATE_KEY) {
        wallet = new ethers.Wallet(import.meta.env.VITE_PRIVATE_KEY);
        useExistingEOA = true;
        setDeploymentStatus('🔧 使用现有 EOA 生成额外账户...');
      } else {
        // 生成新的随机钱包
        wallet = ethers.Wallet.createRandom();
      }

      // 生成不同盐值的多个账户
      // 现有的账户使用 salt 0, 1，新账户使用 salt 2, 3
      const saltStart = useExistingEOA ? 2 : 0;
      const saltA = saltStart;
      const saltB = saltStart + 1;

      // 编码函数调用数据
      const callDataA = iface.encodeFunctionData('getAddress', [wallet.address, saltA]);
      const callDataB = iface.encodeFunctionData('getAddress', [wallet.address, saltB]);

      // 直接调用合约方法
      const [resultA, resultB] = await Promise.all([
        provider.call({
          to: FACTORY_ADDRESS,
          data: callDataA
        }),
        provider.call({
          to: FACTORY_ADDRESS,
          data: callDataB
        })
      ]);

      // 解码结果
      const accountA = iface.decodeFunctionResult('getAddress', resultA)[0];
      const accountB = iface.decodeFunctionResult('getAddress', resultB)[0];

      // 验证生成的地址
      if (accountA === accountB || accountA === FACTORY_ADDRESS || accountB === FACTORY_ADDRESS) {
        throw new Error('地址生成失败：生成了重复或无效地址');
      }

      const result = {
        privateKey: wallet.privateKey,
        eoaAddress: wallet.address,
        accountA,
        accountB,
        saltA,
        saltB,
        useExistingEOA
      };

      setGeneratedAccounts(result);

      if (useExistingEOA) {
        setDeploymentStatus(`✅ 使用现有 EOA 生成额外账户！(Salt ${saltA}, ${saltB})`);
      } else {
        setDeploymentStatus('✅ 新账户生成完成！请复制配置并添加资金');
      }

      console.log('Generated accounts using Factory:', {
        EOA: wallet.address,
        AccountA: accountA,
        AccountB: accountB,
        SaltA: saltA,
        SaltB: saltB,
        UseExistingEOA: useExistingEOA,
        AllDifferent: accountA !== accountB && accountA !== FACTORY_ADDRESS && accountB !== FACTORY_ADDRESS
      });

    } catch (error: any) {
      console.error('Generate accounts failed:', error);
      setDeploymentStatus(`❌ 生成失败: ${error.message}`);
    }
  };

  const deployAccounts = async () => {
    if (!signer && !privateKey) {
      setDeploymentStatus('❌ 需要连接钱包或私钥');
      return;
    }

    // 如果有生成的账户，使用生成的账户信息；否则使用环境变量
    let targetAddresses;
    let targetSalts;
    let ownerAddress;

    if (generatedAccounts) {
      ownerAddress = generatedAccounts.eoaAddress;
      targetAddresses = {
        accountA: generatedAccounts.accountA,
        accountB: generatedAccounts.accountB
      };
      targetSalts = {
        saltA: generatedAccounts.saltA || 0,
        saltB: generatedAccounts.saltB || 1
      };
    } else {
      if (!NODE_HTTP || !EOA_ADDRESS || !SIMPLE_ACCOUNT_A || !SIMPLE_ACCOUNT_B) {
        setDeploymentStatus('❌ 缺少必要的环境变量配置，请先生成账户');
        return;
      }
      ownerAddress = EOA_ADDRESS;
      targetAddresses = {
        accountA: SIMPLE_ACCOUNT_A,
        accountB: SIMPLE_ACCOUNT_B
      };
      targetSalts = {
        saltA: 0,
        saltB: 1
      };
    }

    setIsDeploying(true);
    setDeploymentStatus('🚀 开始部署 SimpleAccount...');

    try {
      const provider = new ethers.JsonRpcProvider(NODE_HTTP);
      let deployerSigner: ethers.Signer;

      if (signer) {
        deployerSigner = signer;
      } else if (privateKey) {
        deployerSigner = new ethers.Wallet(privateKey, provider);
      } else {
        throw new Error('No signer available');
      }

      const factory = new ethers.Contract(FACTORY_ADDRESS, SIMPLE_ACCOUNT_FACTORY_ABI, deployerSigner);

      // 检查 EOA 余额
      const balance = await provider.getBalance(ownerAddress);
      setDeploymentStatus(`💰 检查 EOA 余额: ${ethers.formatEther(balance)} ETH`);

      if (balance < ethers.parseEther("0.01")) {
        throw new Error("EOA 余额不足，需要至少 0.01 ETH 用于部署");
      }

      // 检查当前部署状态
      const [codeA, codeB] = await Promise.all([
        provider.getCode(targetAddresses.accountA),
        provider.getCode(targetAddresses.accountB)
      ]);

      const isADeployed = codeA !== "0x";
      const isBDeployed = codeB !== "0x";

      setDeploymentStatus(`🏠 检查部署状态: A=${isADeployed ? '已部署' : '未部署'}, B=${isBDeployed ? '已部署' : '未部署'}`);

      const result: DeploymentResult = {
        accountA: targetAddresses.accountA,
        accountB: targetAddresses.accountB,
        deployed: false
      };

      // 部署账户 A
      if (!isADeployed) {
        setDeploymentStatus(`🔧 部署账户 A (salt=${targetSalts.saltA})...`);
        const txA = await factory.createAccount(ownerAddress, targetSalts.saltA);
        setDeploymentStatus(`📝 账户 A 交易已发送: ${txA.hash}`);

        const receiptA = await txA.wait();
        setDeploymentStatus(`✅ 账户 A 部署成功！区块: ${receiptA.blockNumber}`);
        result.txHashA = txA.hash;

        console.log(`账户 A 部署成功: ${targetAddresses.accountA}, 交易: ${txA.hash}`);
      } else {
        setDeploymentStatus('✅ 账户 A 已存在，跳过部署');
      }

      // 部署账户 B
      if (!isBDeployed) {
        setDeploymentStatus(`🔧 部署账户 B (salt=${targetSalts.saltB})...`);
        const txB = await factory.createAccount(ownerAddress, targetSalts.saltB);
        setDeploymentStatus(`📝 账户 B 交易已发送: ${txB.hash}`);

        const receiptB = await txB.wait();
        setDeploymentStatus(`✅ 账户 B 部署成功！区块: ${receiptB.blockNumber}`);
        result.txHashB = txB.hash;

        console.log(`账户 B 部署成功: ${targetAddresses.accountB}, 交易: ${txB.hash}`);
      } else {
        setDeploymentStatus('✅ 账户 B 已存在，跳过部署');
      }

      // 最终验证
      setDeploymentStatus('🔍 最终验证...');
      const [finalCodeA, finalCodeB] = await Promise.all([
        provider.getCode(targetAddresses.accountA),
        provider.getCode(targetAddresses.accountB)
      ]);

      const finalADeployed = finalCodeA !== "0x";
      const finalBDeployed = finalCodeB !== "0x";

      result.deployed = finalADeployed && finalBDeployed;

      if (result.deployed) {
        setDeploymentStatus('🎉 所有账户部署完成！现在可以在 Etherscan 上查看');
      } else {
        setDeploymentStatus('⚠️ 部分账户部署失败，请检查交易状态');
      }

      setDeploymentResult(result);

      // 刷新状态
      await checkAccountsStatus();
      await loadEoaBalance();

    } catch (error: any) {
      console.error('Deployment failed:', error);
      setDeploymentStatus(`❌ 部署失败: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板！');
    });
  };

  const minBalance = 0.01;
  const hasEnoughBalance = parseFloat(eoaBalance) >= minBalance;

  return (
    <div className="account-deployer-card">
      <div className="card-header">
        <h3>🏗️ Account Deployer</h3>
        <div className={`status-badge ${hasEnoughBalance ? 'status-success' : 'status-warning'}`}>
          {hasEnoughBalance ? '✅ 可部署' : '⚠️ 余额不足'}
        </div>
      </div>

      <div className="deployer-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">EOA 余额</span>
            <span className={`info-value ${hasEnoughBalance ? 'sufficient' : 'insufficient'}`}>
              {eoaBalance} ETH
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">最低需求</span>
            <span className="info-value">0.01 ETH</span>
          </div>
          <div className="info-item">
            <span className="info-label">Factory 合约</span>
            <span className="info-value contract-address">
              {FACTORY_ADDRESS.slice(0, 6)}...{FACTORY_ADDRESS.slice(-4)}
            </span>
          </div>
        </div>

        {accountsStatus && (
          <div className="accounts-status">
            <h4>📋 当前账户状态</h4>
            <div className="status-grid">
              <div className={`status-item ${accountsStatus.accountA.deployed ? 'deployed' : 'not-deployed'}`}>
                <span className="status-label">SimpleAccount A</span>
                <span className="status-indicator">
                  {accountsStatus.accountA.deployed ? '✅ 已部署' : '❌ 未部署'}
                </span>
              </div>
              <div className={`status-item ${accountsStatus.accountB.deployed ? 'deployed' : 'not-deployed'}`}>
                <span className="status-label">SimpleAccount B</span>
                <span className="status-indicator">
                  {accountsStatus.accountB.deployed ? '✅ 已部署' : '❌ 未部署'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="deployer-actions">
        <button
          className="btn btn-secondary"
          onClick={generateNewAccounts}
          disabled={isDeploying}
        >
          {EOA_ADDRESS && import.meta.env.VITE_PRIVATE_KEY ?
            '🔧 生成额外账户 (Salt 2,3)' :
            '🎲 生成新测试账户'
          }
        </button>

        <button
          className="btn btn-primary"
          onClick={deployAccounts}
          disabled={isDeploying || !hasEnoughBalance || !(signer || privateKey)}
        >
          {isDeploying ? '🔄 部署中...' : '🚀 实际部署到链上'}
        </button>
      </div>

      {deploymentStatus && (
        <div className="deployment-status">
          <div className="status-message">{deploymentStatus}</div>
        </div>
      )}

      {generatedAccounts && (
        <div className="generated-accounts">
          <h4>🔑 生成的测试账户</h4>
          <div className="account-details">
            <div className="detail-row">
              <span className="detail-label">私钥:</span>
              <span className="detail-value private-key">{generatedAccounts.privateKey}</span>
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(generatedAccounts.privateKey)}
              >
                📋
              </button>
            </div>
            <div className="detail-row">
              <span className="detail-label">EOA 地址:</span>
              <span className="detail-value">{generatedAccounts.eoaAddress}</span>
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(generatedAccounts.eoaAddress)}
              >
                📋
              </button>
            </div>
            <div className="detail-row">
              <span className="detail-label">SimpleAccount A:</span>
              <span className="detail-value">{generatedAccounts.accountA}</span>
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(generatedAccounts.accountA)}
              >
                📋
              </button>
            </div>
            <div className="detail-row">
              <span className="detail-label">SimpleAccount B:</span>
              <span className="detail-value">{generatedAccounts.accountB}</span>
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(generatedAccounts.accountB)}
              >
                📋
              </button>
            </div>
          </div>

          <div className="funding-instructions">
            <h5>💰 资金配置说明</h5>
            <div className="instruction-item">
              <span className="instruction-step">1.</span>
              <span className="instruction-text">
                向 EOA 地址发送 0.05 ETH (用于 gas):
                <code>{generatedAccounts.eoaAddress}</code>
              </span>
            </div>
            <div className="instruction-item">
              <span className="instruction-step">2.</span>
              <span className="instruction-text">
                向 SimpleAccount A 发送 100 PNT 代币 (用于转账测试):
                <code>{generatedAccounts.accountA}</code>
              </span>
            </div>
            <div className="instruction-item">
              <span className="instruction-step">3.</span>
              <span className="instruction-text">
                更新 .env 文件中的地址配置
              </span>
            </div>
          </div>

          <div className="env-config">
            <h5>📝 .env 配置</h5>
            <pre className="config-code">
{`VITE_PRIVATE_KEY="${generatedAccounts.privateKey}"
VITE_EOA_ADDRESS="${generatedAccounts.eoaAddress}"
VITE_SIMPLE_ACCOUNT_A="${generatedAccounts.accountA}"
VITE_SIMPLE_ACCOUNT_B="${generatedAccounts.accountB}"`}
            </pre>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => copyToClipboard(`VITE_PRIVATE_KEY="${generatedAccounts.privateKey}"
VITE_EOA_ADDRESS="${generatedAccounts.eoaAddress}"
VITE_SIMPLE_ACCOUNT_A="${generatedAccounts.accountA}"
VITE_SIMPLE_ACCOUNT_B="${generatedAccounts.accountB}"`)}
            >
              📋 复制 .env 配置
            </button>
          </div>
        </div>
      )}

      {deploymentResult && (
        <div className="deployment-result">
          <h4>📊 部署结果</h4>
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">账户 A 地址:</span>
              <span className="result-value">{deploymentResult.accountA}</span>
            </div>
            <div className="result-item">
              <span className="result-label">账户 B 地址:</span>
              <span className="result-value">{deploymentResult.accountB}</span>
            </div>
            {deploymentResult.txHashA && (
              <div className="result-item">
                <span className="result-label">账户 A 交易:</span>
                <span className="result-value tx-hash">{deploymentResult.txHashA}</span>
              </div>
            )}
            {deploymentResult.txHashB && (
              <div className="result-item">
                <span className="result-label">账户 B 交易:</span>
                <span className="result-value tx-hash">{deploymentResult.txHashB}</span>
              </div>
            )}
            <div className="result-item">
              <span className="result-label">部署状态:</span>
              <span className={`result-value ${deploymentResult.deployed ? 'success' : 'failed'}`}>
                {deploymentResult.deployed ? '✅ 成功' : '❌ 失败'}
              </span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .account-deployer-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h3 {
          margin: 0;
          color: #1a1a1a;
          font-size: 1.25rem;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-success {
          background: #d4edda;
          color: #155724;
        }

        .status-warning {
          background: #fff3cd;
          color: #856404;
        }

        .deployer-info {
          margin-bottom: 20px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 0.875rem;
          color: #666;
          font-weight: 500;
        }

        .info-value {
          font-weight: 600;
          color: #1a1a1a;
        }

        .info-value.sufficient {
          color: #28a745;
        }

        .info-value.insufficient {
          color: #dc3545;
        }

        .info-value.contract-address {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
        }

        .accounts-status {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .accounts-status h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          color: #1a1a1a;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .status-item.deployed {
          background: #f8fff8;
          border-color: #28a745;
        }

        .status-item.not-deployed {
          background: #fff8f8;
          border-color: #dc3545;
        }

        .status-label {
          font-weight: 500;
          color: #555;
        }

        .status-indicator {
          font-size: 0.875rem;
        }

        .deployer-actions {
          display: flex;
          gap: 12px;
          margin: 20px 0;
          flex-wrap: wrap;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid;
          background: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          border-color: #007bff;
          color: #007bff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }

        .btn-secondary {
          border-color: #6c757d;
          color: #6c757d;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #6c757d;
          color: white;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.75rem;
        }

        .deployment-status {
          background: #e3f2fd;
          border: 1px solid #1976d2;
          border-radius: 8px;
          padding: 12px;
          margin: 16px 0;
        }

        .status-message {
          color: #1976d2;
          font-weight: 500;
        }

        .generated-accounts {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .generated-accounts h4 {
          margin: 0 0 16px 0;
          color: #1a1a1a;
        }

        .account-details {
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding: 8px;
          background: white;
          border-radius: 6px;
        }

        .detail-label {
          min-width: 120px;
          font-weight: 500;
          color: #555;
        }

        .detail-value {
          flex: 1;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          word-break: break-all;
        }

        .detail-value.private-key {
          background: #ffe6e6;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ffcdd2;
        }

        .funding-instructions {
          margin: 16px 0;
          padding: 12px;
          background: #fff3cd;
          border-radius: 6px;
        }

        .funding-instructions h5 {
          margin: 0 0 12px 0;
          color: #856404;
        }

        .instruction-item {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          align-items: flex-start;
        }

        .instruction-step {
          background: #856404;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .instruction-text {
          color: #856404;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .instruction-text code {
          background: rgba(133, 100, 4, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.8rem;
        }

        .env-config {
          margin-top: 16px;
        }

        .env-config h5 {
          margin: 0 0 8px 0;
          color: #1a1a1a;
        }

        .config-code {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
          margin: 8px 0;
          overflow-x: auto;
        }

        .deployment-result {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .deployment-result h4 {
          margin: 0 0 12px 0;
          color: #155724;
        }

        .result-grid {
          display: grid;
          gap: 8px;
        }

        .result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: white;
          border-radius: 4px;
        }

        .result-label {
          font-weight: 500;
          color: #155724;
        }

        .result-value {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.875rem;
        }

        .result-value.success {
          color: #28a745;
          font-weight: 600;
        }

        .result-value.failed {
          color: #dc3545;
          font-weight: 600;
        }

        .result-value.tx-hash {
          color: #007bff;
        }

        @media (max-width: 768px) {
          .deployer-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default AccountDeployer;