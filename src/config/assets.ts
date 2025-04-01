import { Chain, baseSepolia, holesky, base, optimism, arbitrum, mainnet } from 'wagmi/chains';

export interface Asset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  minAmount: string;
  maxAmount: string;
}

export interface ChainAssets {
  chain: Chain;
  assets: Asset[];
}

export const MAINNET_ASSETS: ChainAssets[] = [
  {
    chain: mainnet,
    assets: [
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        minAmount: '1',
        maxAmount: '100000',
      },
      {
        address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
        symbol: 'wstETH',
        name: 'Wrapped Staked ETH',
        decimals: 18,
        minAmount: '0.001',
        maxAmount: '1',
      },
      {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
        symbol: 'stETH',
        name: 'Lido Staked ETH',
        decimals: 18,
        minAmount: '0.001',
        maxAmount: '1',
      },
    ],
  },
  {
    chain: base,
    assets: [
      {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        minAmount: '1',
        maxAmount: '100000',
      },
      {
        address: '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452', // wstETH
        symbol: 'wstETH',
        name: 'Wrapped Staked ETH',
        decimals: 18,
        minAmount: '0.001',
        maxAmount: '1',
      },
    ],
  },
  {
    chain: optimism,
    assets: [
      {
        address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        minAmount: '1',
        maxAmount: '100000',
      },
    ],
  },
  {
    chain: arbitrum,
    assets: [
      {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        minAmount: '1',
        maxAmount: '100000',
      },
    ],
  },
];

export const TESTNET_ASSETS: ChainAssets[] = [
  {
    chain: baseSepolia,
    assets: [
      {
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        minAmount: '1',
        maxAmount: '100000',
      },
      {
        address: '0x6319df7c227e34B967C1903A08a698A3cC43492B', // Mock wstETH
        symbol: 'wstETH',
        name: 'Wrapped Staked ETH',
        decimals: 18,
        minAmount: '0.001',
        maxAmount: '1',
      },
    ],
  },
  {
    chain: holesky,
    assets: [
      {
        address: '0x8d09a4502cc8cf1547ad300e066060d043f6982d', // wstETH
        symbol: 'wstETH',
        name: 'Wrapped Staked ETH',
        decimals: 18,
        minAmount: '0.001',
        maxAmount: '1',
      },
      {
        address: '0x3f1c547b21f65e10480de3ad8e19faac46c95034', // stETH
        symbol: 'stETH',
        name: 'Lido Staked ETH',
        decimals: 18,
        minAmount: '0.001',
        maxAmount: '1',
      },
    ],
  },
];

export const getSupportedAssets = (network: 'mainnet' | 'testnet') => {
  return network === 'mainnet' ? MAINNET_ASSETS : TESTNET_ASSETS;
};

export const getSupportedChains = (network: 'mainnet' | 'testnet') => {
  return network === 'mainnet' 
    ? [mainnet, base, optimism, arbitrum]
    : [baseSepolia, holesky];
}; 