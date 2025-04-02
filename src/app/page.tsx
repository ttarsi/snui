'use client';

import { useState } from 'react';
import { Chain } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNetwork } from '@/context/NetworkContext';
import { ChainSelector } from '@/components/ChainSelector';
import { AssetSelector } from '@/components/AssetSelector';
import { OrderForm } from '@/components/OrderForm';
import { getSupportedAssets } from '@/config/assets';
import { Asset } from '@/config/assets';

export default function Home() {
  const { network, setNetwork } = useNetwork();
  const supportedAssets = getSupportedAssets(network);
  const [sourceChain, setSourceChain] = useState<Chain>(supportedAssets[0].chain);
  const [destinationChain, setDestinationChain] = useState<Chain>(supportedAssets[1].chain);
  const [sourceAsset, setSourceAsset] = useState<Asset | null>(supportedAssets[0].assets[0]);
  const [destinationAsset, setDestinationAsset] = useState<Asset | null>(supportedAssets[1].assets[0]);

  const handleSourceChainChange = (chain: Chain) => {
    setSourceChain(chain);
    const chainAssets = supportedAssets.find(ca => ca.chain.id === chain.id);
    if (chainAssets) {
      setSourceAsset(chainAssets.assets[0]);
    }
  };

  const handleDestinationChainChange = (chain: Chain) => {
    setDestinationChain(chain);
    const chainAssets = supportedAssets.find(ca => ca.chain.id === chain.id);
    if (chainAssets) {
      setDestinationAsset(chainAssets.assets[0]);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="fixed top-4 right-4">
        <ConnectButton />
      </div>
      
      <div className="fixed top-4 left-1/2 -translate-x-1/2">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setNetwork('mainnet')}
            className={`px-4 py-2 text-sm font-medium border ${
              network === 'mainnet'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300'
            } rounded-l-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-indigo-500`}
          >
            Mainnet
          </button>
          <button
            type="button"
            onClick={() => setNetwork('testnet')}
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              network === 'testnet'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300'
            } rounded-r-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-indigo-500`}
          >
            Testnet
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SolverNet UI</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Source Chain</h2>
              <ChainSelector
                onSelect={handleSourceChainChange}
                value={sourceChain}
                label="Source Chain"
                placeholder="Select source chain"
              />
              <AssetSelector
                chain={sourceChain}
                selectedAsset={sourceAsset}
                onSelectAsset={setSourceAsset}
                label="Source Asset"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Destination Chain</h2>
              <ChainSelector
                onSelect={handleDestinationChainChange}
                value={destinationChain}
                label="Destination Chain"
                placeholder="Select destination chain"
              />
              <AssetSelector
                chain={destinationChain}
                selectedAsset={destinationAsset}
                onSelectAsset={setDestinationAsset}
                label="Destination Asset"
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
      </div>
    </main>
  );
}
