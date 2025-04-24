import { Asset } from '@/config/assets';

interface AssetSelectorProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  label: string;
  disabled?: boolean;
}

export function AssetSelector({
  assets,
  selectedAsset,
  onSelectAsset,
  label,
  disabled = false
}: AssetSelectorProps) {
  const selectedValue = selectedAsset ? selectedAsset.id : '';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={selectedValue}
        onChange={(e) => {
          const asset = assets.find((a: Asset) => a.id === e.target.value);
          if (asset) onSelectAsset(asset);
        }}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        disabled={disabled || assets.length === 0}
      >
        <option value="">Select an asset</option>
        {assets.map((asset: Asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.symbol}
          </option>
        ))}
      </select>
    </div>
  );
} 