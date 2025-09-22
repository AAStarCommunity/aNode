// 网络配置
export interface NetworkConfig {
  id: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    entryPoint: string;
    entryPointV07?: string;  // EntryPoint v0.7 address
    factory: string;
  };
  bundlerUrl?: string;
  alchemy?: {
    network: string;  // Alchemy network identifier
    apiKey?: string;  // Optional API key override
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    rpcUrl: import.meta.env.VITE_NODE_HTTP || import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      entryPoint: import.meta.env.VITE_ENTRYPOINT_ADDRESS || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',  // v0.6
      entryPointV07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',  // v0.7
      factory: import.meta.env.VITE_FACTORY_ADDRESS || '0x9406Cc6185a346906296840746125a0E44976454',
    },
    bundlerUrl: import.meta.env.VITE_BUNDLER_URL || 'https://rundler-superrelay.fly.dev',
    alchemy: {
      network: 'eth-sepolia',
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY
    }
  },
  opSepolia: {
    id: 11155420,
    name: 'OP Sepolia',
    rpcUrl: import.meta.env.VITE_OP_SEPOLIA_RPC || 'https://sepolia.optimism.io',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',  // v0.6
      entryPointV07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',  // v0.7
      factory: '0x9406Cc6185a346906296840746125a0E44976454',
    },
    bundlerUrl: import.meta.env.VITE_BUNDLER_URL || 'https://rundler-superrelay.fly.dev',
    alchemy: {
      network: 'opt-sepolia',
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY
    }
  },
  opMainnet: {
    id: 10,
    name: 'OP Mainnet',
    rpcUrl: import.meta.env.VITE_OP_MAINNET_RPC || 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',  // v0.6
      entryPointV07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',  // v0.7
      factory: '0x9406Cc6185a346906296840746125a0E44976454',
    },
    bundlerUrl: import.meta.env.VITE_BUNDLER_URL || 'https://rundler-superrelay.fly.dev',
    alchemy: {
      network: 'opt-mainnet',
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY
    }
  },
};

export const DEFAULT_NETWORK = 'sepolia';

// 获取 JiffyScan URL
export const getJiffyScanUrl = (userOpHash: string, networkKey: string): string => {
  const networkMap: Record<string, string> = {
    sepolia: 'sepolia',
    opSepolia: 'op-sepolia',
    opMainnet: 'optimism',
  };

  const network = networkMap[networkKey] || 'sepolia';
  return `https://jiffyscan.xyz/userOpHash/${userOpHash}?network=${network}&section=overview`;
};

// 获取区块浏览器交易 URL
export const getBlockExplorerTxUrl = (txHash: string, networkKey: string): string => {
  const network = NETWORKS[networkKey];
  return `${network.blockExplorer}/tx/${txHash}`;
};

// 获取区块浏览器地址 URL
export const getBlockExplorerAddressUrl = (address: string, networkKey: string): string => {
  const network = NETWORKS[networkKey];
  return `${network.blockExplorer}/address/${address}`;
};