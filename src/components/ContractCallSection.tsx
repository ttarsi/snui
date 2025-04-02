import { Chain } from 'wagmi/chains';
import { isAddress } from 'viem';

export interface ContractFunction {
  type: string;
  name: string;
  inputs: {
    name: string;
    type: string;
    internalType: string;
  }[];
  stateMutability: string;
}

interface ContractCallSectionProps {
  contractAddress: string;
  setContractAddress: (address: string) => void;
  contractABI: ContractFunction[];
  selectedFunction: ContractFunction | null;
  setSelectedFunction: (func: ContractFunction | null) => void;
  functionInputs: Record<string, string>;
  setFunctionInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isLoadingABI: boolean;
  abiError: string | null;
  destinationChain: Chain;
}

export function ContractCallSection({
  contractAddress,
  setContractAddress,
  contractABI,
  selectedFunction,
  setSelectedFunction,
  functionInputs,
  setFunctionInputs,
  isLoadingABI,
  abiError,
  destinationChain,
}: ContractCallSectionProps) {
  const writeFunctions = contractABI.filter(
    (item) => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure'
  );

  const handleFunctionSelect = (func: ContractFunction) => {
    setSelectedFunction(func);
    const inputs: Record<string, string> = {};
    func.inputs.forEach(input => {
      inputs[input.name] = '';
    });
    setFunctionInputs(inputs);
  };

  const handleInputChange = (name: string, value: string) => {
    setFunctionInputs((prev) => {
      const newInputs: Record<string, string> = { ...prev };
      newInputs[name] = value;
      return newInputs;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Contract Call</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Contract Address</label>
        <input
          type="text"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="0x..."
        />
        {contractAddress && !isAddress(contractAddress) && (
          <p className="mt-1 text-sm text-red-600">Invalid address format</p>
        )}
      </div>

      {isLoadingABI && (
        <div className="text-sm text-gray-500">Loading contract ABI...</div>
      )}

      {abiError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Failed to Load Contract</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to fetch contract ABI. This could be because:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>The contract is not verified on the block explorer</li>
                  <li>The contract address is incorrect</li>
                  <li>The contract is not deployed on this network</li>
                  <li>API key is missing or invalid</li>
                </ul>
                <p className="mt-2">Error details: {abiError}</p>
                <p className="mt-1">Chain: {destinationChain.name} ({destinationChain.id})</p>
                <p className="mt-1">Contract: {contractAddress}</p>
                <p className="mt-2">Please verify the contract address and try again.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {writeFunctions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Function</label>
          <select
            value={selectedFunction?.name || ''}
            onChange={(e) => {
              const func = writeFunctions.find(f => f.name === e.target.value);
              if (func) handleFunctionSelect(func);
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a function</option>
            {writeFunctions.map((func) => (
              <option key={func.name} value={func.name}>
                {func.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedFunction && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Function Parameters</label>
          {selectedFunction.inputs.map((input) => (
            <div key={input.name}>
              <label className="block text-sm text-gray-600">
                {input.name} ({input.type})
              </label>
              <input
                type="text"
                value={functionInputs[input.name] || ''}
                onChange={(e) => handleInputChange(input.name, e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 