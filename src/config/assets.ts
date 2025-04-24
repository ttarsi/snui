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

export const getSupportedAssets = (/* network: 'mainnet' | 'testnet', */ allTokens: Asset[]): ChainAssets[] => {
  const targetChains = [mainnet, base, optimism, arbitrum]; // Always Mainnet

  return targetChains.map(chain => ({
    chain,
    assets: allTokens.filter(token => token.chainId === chain.id)
  }));
};

export const getSupportedChains = () => {
  return [mainnet, base, optimism, arbitrum]; // Always Mainnet
}; 