import { Chain } from 'wagmi/chains';

interface OrderStatusProps {
  status: string;
  txHash?: string;
  sourceChain: Chain;
  validation?: {
    status: string;
    rejectReason?: string;
    rejectDescription?: string;
  };
}

export function OrderStatus({ status, txHash, sourceChain, validation }: OrderStatusProps) {
  if (validation?.status === 'rejected') {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Order Rejected</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Reason: {validation.rejectReason}</p>
              <p>Description: {validation.rejectDescription}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'open') {
    return (
      <div className="rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Order Pending</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your order is being processed. Please wait...</p>
              {txHash && (
                <p className="mt-1">
                  Source Transaction: {sourceChain.blockExplorers?.default?.url ? (
                    <a 
                      href={`${sourceChain.blockExplorers.default.url}/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View on Explorer →
                    </a>
                  ) : (
                    <span className="font-mono text-sm">{txHash}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'filled') {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Order Filled</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Your order has been successfully filled!</p>
              {txHash && (
                <p className="mt-1">
                  Source Transaction: {sourceChain.blockExplorers?.default?.url ? (
                    <a 
                      href={`${sourceChain.blockExplorers.default.url}/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View on Explorer →
                    </a>
                  ) : (
                    <span className="font-mono text-sm">{txHash}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 