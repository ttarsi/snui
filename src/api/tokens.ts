import { Asset } from '@/config/assets';
import { Chain, mainnet, base, optimism, arbitrum } from 'wagmi/chains';
import { isAddress, zeroAddress } from 'viem';

// Interfaces for API response structure
interface ApiToken {
  enabled: boolean;
  name: string;
  symbol: string;
  chainId: number;
  address: string;
  decimals: number;
  expenseMin?: string;
  expenseMax?: string;
}

interface ApiResponse {
  tokens: ApiToken[];
}

// Mapping from chain ID to wagmi Chain object
const chainIdMap: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [base.id]: base,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
};

// Placeholder for fetching token icons
const getTokenIconUrl = (/* symbol: string */): string => {
    return ''; // No icons for now
};

/**
 * Fetches the list of supported tokens from the Solver API
 * and maps them to the internal Asset structure.
 */
export const fetchSupportedTokens = async (): Promise<Asset[]> => {
  const response = await fetch('https://solver.mainnet.omni.network/api/v1/tokens');
  if (!response.ok) {
    console.error("Failed to fetch tokens, status:", response.status);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  try {
      const data: ApiResponse = await response.json();

      const mappedTokens = data.tokens
        .filter(token => token.enabled && chainIdMap[token.chainId]) // Only enabled tokens on supported chains
        .map((token): Asset => {
            const chain = chainIdMap[token.chainId];
            const isNative = token.address === zeroAddress || token.address === '0x0000000000000000000000000000000000000000';
            const nativeCurrency = chain.nativeCurrency;

            return {
                id: `${token.chainId}-${token.symbol}`, // Unique ID based on chain and symbol
                name: isNative ? nativeCurrency.name : token.name,
                symbol: isNative ? nativeCurrency.symbol : token.symbol,
                address: isNative ? undefined : (isAddress(token.address) ? token.address as `0x${string}` : undefined),
                decimals: isNative ? nativeCurrency.decimals : token.decimals,
                isNative: isNative,
                chainId: token.chainId,
                logoURI: getTokenIconUrl(/* token.symbol */),
                // TODO: Replace placeholders with actual min/max amounts if available from API
                minAmount: '0.001',
                maxAmount: '1000',
            };
        });

      return mappedTokens;
  } catch (error) {
      console.error("Failed to parse tokens response:", error);
      throw new Error('Failed to parse token data');
  }
}; 