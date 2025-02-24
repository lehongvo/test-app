interface RequestArguments {
  method: string;
  params?: unknown[];
}

// Định nghĩa kiểu cho từng loại event
interface EthereumEvents {
  accountsChanged: (accounts: string[]) => void;
  connect: (connectInfo: { chainId: string }) => void;
  disconnect: (error: { code: number; message: string }) => void;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: RequestArguments) => Promise<unknown>;
  // Sử dụng generic để type-safe cho từng loại event
  on<K extends keyof EthereumEvents>(
    event: K,
    callback: EthereumEvents[K]
  ): void;
  removeListener<K extends keyof EthereumEvents>(
    event: K,
    callback: EthereumEvents[K]
  ): void;
}

interface Window {
  ethereum?: EthereumProvider;
  [key: string]: unknown;
}
