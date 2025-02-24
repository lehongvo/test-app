interface RequestArguments {
  method: string;
  params?: unknown[];
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: RequestArguments) => Promise<unknown>;
  on: (event: string, callback: (params: string[]) => void) => void;
}

interface Window {
  ethereum?: EthereumProvider;
  [key: string]: unknown;
}
