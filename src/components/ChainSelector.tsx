'use client';

import { useState } from 'react';
import { Chain } from 'wagmi/chains';
import { useNetwork } from '@/context/NetworkContext';
import { getSupportedChains, getSupportedAssets, ChainAssets, Asset } from '@/config/assets';

interface ChainSelectorProps {
  onSourceSelect: (chain: Chain, asset: Asset) => void;
  onDestinationSelect: (chain: Chain, asset: Asset) => void;
}

export function ChainSelector({ onSourceSelect, onDestinationSelect }: ChainSelectorProps) {
  const { network } = useNetwork();
  const supportedChains = getSupportedChains(network);
  const supportedAssets = getSupportedAssets(network);
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [destinationChain, setDestinationChain] = useState<Chain | null>(null);
  const [sourceAsset, setSourceAsset] = useState<Asset | null>(null);
  const [destinationAsset, setDestinationAsset] = useState<Asset | null>(null);

  const handleSourceChainChange = (chain: Chain) => {
    setSourceChain(chain);
    setSourceAsset(null);
    const chainAssets = supportedAssets.find((ca: ChainAssets) => ca.chain.id === chain.id);
    if (chainAssets) {
      onSourceSelect(chain, chainAssets.assets[0]);
    }
  };

  const handleDestinationChainChange = (chain: Chain) => {
    setDestinationChain(chain);
    setDestinationAsset(null);
    const chainAssets = supportedAssets.find((ca: ChainAssets) => ca.chain.id === chain.id);
    if (chainAssets) {
      onDestinationSelect(chain, chainAssets.assets[0]);
    }
  };

  const handleSourceAssetChange = (asset: Asset) => {
    setSourceAsset(asset);
    if (sourceChain) {
      onSourceSelect(sourceChain, asset);
    }
  };

  const handleDestinationAssetChange = (asset: Asset) => {
    setDestinationAsset(asset);
    if (destinationChain) {
      onDestinationSelect(destinationChain, asset);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Source Chain</label>
        <select
          value={sourceChain?.id || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          onChange={(e) => {
            const chain = supportedChains.find((c: Chain) => c.id === Number(e.target.value));
            if (chain) handleSourceChainChange(chain);
          }}
        >
          <option value="">Select source chain</option>
          {supportedChains.map((chain: Chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      {sourceChain && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Source Asset</label>
          <select
            value={sourceAsset?.address || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            onChange={(e) => {
              const chainAssets = supportedAssets.find((ca: ChainAssets) => ca.chain.id === sourceChain.id);
              const asset = chainAssets?.assets.find((a: Asset) => a.address === e.target.value);
              if (asset) handleSourceAssetChange(asset);
            }}
          >
            <option value="">Select source asset</option>
            {supportedAssets
              .find((ca: ChainAssets) => ca.chain.id === sourceChain.id)
              ?.assets.map((asset: Asset) => (
                <option key={asset.address} value={asset.address}>
                  {asset.symbol}
                </option>
              ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Destination Chain</label>
        <select
          value={destinationChain?.id || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          onChange={(e) => {
            const chain = supportedChains.find((c: Chain) => c.id === Number(e.target.value));
            if (chain) handleDestinationChainChange(chain);
          }}
        >
          <option value="">Select destination chain</option>
          {supportedChains.map((chain: Chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      {destinationChain && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Destination Asset</label>
          <select
            value={destinationAsset?.address || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            onChange={(e) => {
              const chainAssets = supportedAssets.find((ca: ChainAssets) => ca.chain.id === destinationChain.id);
              const asset = chainAssets?.assets.find((a: Asset) => a.address === e.target.value);
              if (asset) handleDestinationAssetChange(asset);
            }}
          >
            <option value="">Select destination asset</option>
            {supportedAssets
              .find((ca: ChainAssets) => ca.chain.id === destinationChain.id)
              ?.assets.map((asset: Asset) => (
                <option key={asset.address} value={asset.address}>
                  {asset.symbol}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
} 