'use client';

import { useState, useEffect, useMemo } from 'react';
import { Chain, mainnet, base } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChainSelector } from '@/components/ChainSelector';
import { AssetSelector } from '@/components/AssetSelector';
import { OrderForm } from '@/components/OrderForm';
import { getSupportedChains } from '@/config/assets';
import { Asset } from '@/config/assets';
import { useSupportedTokens } from '@/hooks/useSupportedTokens';

export default function Home() {
  const { tokens: allTokens, isLoading: isLoadingTokens, error: tokensError } = useSupportedTokens();

  const supportedChains = getSupportedChains();

  const [sourceChain, setSourceChain] = useState<Chain>(supportedChains[0]);
  const [destinationChain, setDestinationChain] = useState<Chain>(supportedChains[1] ?? supportedChains[0]);

  const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
  const [destinationAsset, setDestinationAsset] = useState<Asset | null>(null);

  const availableSourceAssets = useMemo(() => 
    allTokens.filter(token => token.chainId === sourceChain.id), 
    [allTokens, sourceChain]
  );
  const availableDestinationAssets = useMemo(() => 
    allTokens.filter(token => token.chainId === destinationChain.id), 
    [allTokens, destinationChain]
  );

  useEffect(() => {
    const defaultAsset = availableSourceAssets.length > 0 ? availableSourceAssets[0] : null;

    if (!sourceAsset || !availableSourceAssets.some(asset => asset.id === sourceAsset.id)) {
      setSourceAsset(defaultAsset);
    }
  }, [sourceChain, availableSourceAssets]);

  useEffect(() => {
    const defaultAsset = availableDestinationAssets.length > 0 ? availableDestinationAssets[0] : null;

    if (!destinationAsset || !availableDestinationAssets.some(asset => asset.id === destinationAsset.id)) {
      setDestinationAsset(defaultAsset);
    }
  }, [destinationChain, availableDestinationAssets]);

  const handleSourceChainChange = (chain: Chain) => {
    setSourceChain(chain);
  };

  const handleDestinationChainChange = (chain: Chain) => {
    setDestinationChain(chain);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="fixed top-4 right-4">
        <ConnectButton />
      </div>
      
      <div className="container mx-auto px-4 py-20 pt-28">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SolverNet UI</h1>

        {isLoadingTokens && (
          <div className="text-center py-10">
            <p className="text-gray-600">Loading supported tokens...</p>
          </div>
        )}

        {tokensError && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Tokens</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Could not fetch supported tokens: {tokensError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoadingTokens && !tokensError && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Source Chain</h2>
                <ChainSelector
                  onSelect={handleSourceChainChange}
                  value={sourceChain}
                  label="Source Chain"
                  placeholder="Select source chain"
                  supportedChains={supportedChains}
                />
                <AssetSelector
                  assets={availableSourceAssets}
                  selectedAsset={sourceAsset}
                  onSelectAsset={setSourceAsset}
                  label="Source Asset"
                  disabled={!sourceChain || availableSourceAssets.length === 0}
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Destination Chain</h2>
                <ChainSelector
                  onSelect={handleDestinationChainChange}
                  value={destinationChain}
                  label="Destination Chain"
                  placeholder="Select destination chain"
                  supportedChains={supportedChains}
                />
                <AssetSelector
                  assets={availableDestinationAssets}
                  selectedAsset={destinationAsset}
                  onSelectAsset={setDestinationAsset}
                  label="Destination Asset"
                  disabled={!destinationChain || availableDestinationAssets.length === 0}
                />
              </div>
            </div>

            {sourceChain && destinationChain && sourceAsset && destinationAsset && (
              <OrderForm
                sourceChain={sourceChain}
                destinationChain={destinationChain}
                sourceAsset={sourceAsset}
                destinationAsset={destinationAsset}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
