import { useState, useEffect } from 'react';
import { Asset } from '@/config/assets';
import { Chain, mainnet, base, optimism, arbitrum } from 'wagmi/chains';
import { isAddress, zeroAddress } from 'viem';

interface ApiToken {
  enabled: boolean;
  name: string;
  symbol: string;
  chainId: number;
  address: string;
  decimals: number;
  expenseMin?: string; // Keep optional as they might not be used immediately
  expenseMax?: string; // Keep optional as they might not be used immediately
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
  // Add other supported chains here if needed
};

// Placeholder for fetching token icons (replace with actual logic if available)
const getTokenIconUrl = (/* symbol: string */): string => {
    // Example: return `/icons/${symbol.toLowerCase()}.svg`;
    return ''; // No icons for now
};


export const useSupportedTokens = () => {
  const [tokens, setTokens] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://solver.mainnet.omni.network/api/v1/tokens');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ApiResponse = await response.json();

        const mappedTokens = data.tokens
          .filter(token => token.enabled && chainIdMap[token.chainId]) // Only enabled tokens on supported chains
          .map((token): Asset => {
             const chain = chainIdMap[token.chainId];
             const isNative = token.address === zeroAddress || token.address === '0x0000000000000000000000000000000000000000';
             // Use chain's native currency details if address is zero
             const nativeCurrency = chain.nativeCurrency;

             return {
               id: `${token.chainId}-${token.symbol}`, // Unique ID based on chain and symbol
               name: isNative ? nativeCurrency.name : token.name,
               symbol: isNative ? nativeCurrency.symbol : token.symbol,
               address: isNative ? undefined : (isAddress(token.address) ? token.address as `0x${string}` : undefined),
               decimals: isNative ? nativeCurrency.decimals : token.decimals,
               isNative: isNative,
               chainId: token.chainId, // Keep chainId for easier filtering
               logoURI: getTokenIconUrl(/* token.symbol */), // Add logo URI if available
               // minAmount/maxAmount would likely come from API or config, using placeholders
               minAmount: '0.001',
               maxAmount: '1000',
             };
          });

        setTokens(mappedTokens);
      } catch (e) {
        console.error("Failed to fetch supported tokens:", e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
        setTokens([]); // Clear tokens on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []); // Fetch only once on mount

  return { tokens, isLoading, error };
}; 