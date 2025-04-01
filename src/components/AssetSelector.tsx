import { Chain } from 'wagmi/chains';
import { useNetwork } from '@/context/NetworkContext';
import { getSupportedAssets, ChainAssets, Asset } from '@/config/assets';

interface AssetSelectorProps {
  chain: Chain;
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  label: string;
}

export function AssetSelector({ chain, selectedAsset, onSelectAsset, label }: AssetSelectorProps) {
  const { network } = useNetwork();
  const supportedAssets = getSupportedAssets(network);
  const chainAssets = supportedAssets.find((ca: ChainAssets) => ca.chain.id === chain.id);

  if (!chainAssets) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={selectedAsset?.address || ''}
        onChange={(e) => {
          const asset = chainAssets.assets.find((a: Asset) => a.address === e.target.value);
          if (asset) onSelectAsset(asset);
        }}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      >
        <option value="">Select an asset</option>
        {chainAssets.assets.map((asset: Asset) => (
          <option key={asset.address} value={asset.address}>
            {asset.symbol}
          </option>
        ))}
      </select>
    </div>
  );
} 