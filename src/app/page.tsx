'use client';

import { useState } from 'react';
import { ChainSelector } from '@/components/ChainSelector';
import { OrderForm } from '@/components/OrderForm';
import { Chain } from 'wagmi/chains';
import { Asset } from '@/config/assets';

export default function Home() {
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [destinationChain, setDestinationChain] = useState<Chain | null>(null);
  const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
  const [destinationAsset, setDestinationAsset] = useState<Asset | null>(null);

  const handleSourceSelect = (chain: Chain, asset: Asset) => {
    setSourceChain(chain);
    setSourceAsset(asset);
  };

  const handleDestinationSelect = (chain: Chain, asset: Asset) => {
    setDestinationChain(chain);
    setDestinationAsset(asset);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-8">SolverNet Cross-Chain Transfer</h1>
              
              <ChainSelector
                onSourceSelect={handleSourceSelect}
                onDestinationSelect={handleDestinationSelect}
              />

              {sourceChain && destinationChain && sourceAsset && destinationAsset && (
                <div className="mt-8">
                  <OrderForm
                    sourceChain={sourceChain}
                    destinationChain={destinationChain}
                    sourceAsset={sourceAsset}
                    destinationAsset={destinationAsset}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
