import { Chain, baseSepolia, holesky, base, optimism, arbitrum, mainnet } from 'wagmi/chains';

export interface Asset {
  id: string;
  address?: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  minAmount?: string;
  maxAmount?: string;
  isNative: boolean;
  chainId: number;
  logoURI?: string;
}

export interface ChainAssets {
  chain: Chain;
  assets: Asset[];
}

export const getSupportedAssets = (network: 'mainnet' | 'testnet', allTokens: Asset[]): ChainAssets[] => {
  const targetChains = network === 'mainnet' 
    ? [mainnet, base, optimism, arbitrum] 
    : [baseSepolia, holesky];

  return targetChains.map(chain => ({
    chain,
    assets: allTokens.filter(token => token.chainId === chain.id)
  }));
};

export const getSupportedChains = (network: 'mainnet' | 'testnet') => {
  return network === 'mainnet' 
    ? [mainnet, base, optimism, arbitrum]
    : [baseSepolia, holesky];
}; 