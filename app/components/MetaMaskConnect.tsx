'use client';

import { MetaMaskSDK } from '@metamask/sdk';
import { ConnectionStatus, EventType, ServiceStatus } from '@metamask/sdk-communication-layer';
import { useEffect, useState } from 'react';

interface WalletState {
  accounts: string[];
  chainId: string | null;
  connected: boolean;
  isMetaMask: boolean;
}

interface MetaMaskError {
  code: number;
  message: string;
}

// Thêm interface cho request params
interface RequestArguments {
  method: string;
  params?: unknown[];
}

// Thêm interface cho ethereum provider
interface EthereumProvider {
  request: (args: RequestArguments) => Promise<unknown>;
  isMetaMask?: boolean;
  chainId?: string;
  selectedAddress?: string;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

interface AddEthereumChainParameter {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}

export default function MetaMaskConnect() {
  const [sdk, setSDK] = useState<MetaMaskSDK>();
  const [walletState, setWalletState] = useState<WalletState>({
    accounts: [],
    chainId: null,
    connected: false,
    isMetaMask: false
  });
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Constants
  const REQUIRED_CHAIN_ID = '0x2761'; // Japan Open Chain Testnet
  const CHAIN_CONFIG = {
    chainId: REQUIRED_CHAIN_ID,
    chainName: 'Japan Open Chain Testnet',
    nativeCurrency: {
      name: 'JOCT',
      symbol: 'JOCT',
      decimals: 18
    },
    rpcUrls: ['https://rpc-1.testnet.japanopenchain.org:8545'],
    blockExplorerUrls: ['https://testnet.japanopenchain.org']
  };

  useEffect(() => {
    const initSDK = async () => {
      const MMSDK = new MetaMaskSDK({
        dappMetadata: {
          name: "My Dapp",
          url: window.location.href,
        },
        checkInstallationImmediately: false,
        useDeeplink: true,
        logging: {
          developerMode: false,
        },
        storage: {
          enabled: true,
        },
      });

      await MMSDK.init();
      setSDK(MMSDK);
    };

    initSDK();
  }, []);

  useEffect(() => {
    if (!sdk?.isInitialized()) return;

    const ethereum = sdk.getProvider();

    const onChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      setWalletState(prev => ({
        ...prev,
        chainId
      }));
    };

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setWalletState(prev => ({
        ...prev,
        accounts,
        connected: accounts.length > 0
      }));
    };

    const onConnect = () => {
      setWalletState(prev => ({
        ...prev,
        connected: true
      }));
    };

    const onDisconnect = () => {
      setWalletState({
        accounts: [],
        chainId: null,
        connected: false,
        isMetaMask: false
      });
    };

    const onServiceStatus = (_serviceStatus: ServiceStatus) => {
      setServiceStatus(_serviceStatus);
    };

    ethereum?.on('chainChanged', onChainChanged);
    ethereum?.on('accountsChanged', onAccountsChanged);
    ethereum?.on('connect', onConnect);
    ethereum?.on('disconnect', onDisconnect);
    sdk.on(EventType.SERVICE_STATUS, onServiceStatus);

    // Check initial connection
    if (ethereum?.selectedAddress) {
      const address = ethereum.selectedAddress as string;
      setWalletState(prev => ({
        ...prev,
        accounts: [address],
        chainId: ethereum.chainId as string || null,
        connected: true,
        isMetaMask: true
      }));
    }

    return () => {
      ethereum?.removeListener('chainChanged', onChainChanged);
      ethereum?.removeListener('accountsChanged', onAccountsChanged);
      ethereum?.removeListener('connect', onConnect);
      ethereum?.removeListener('disconnect', onDisconnect);
      sdk.removeListener(EventType.SERVICE_STATUS, onServiceStatus);
    };
  }, [sdk]);

  const switchNetwork = async (ethereum: EthereumProvider) => {
    try {
      // Thử chuyển sang mạng yêu cầu
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_CHAIN_ID }],
      });
    } catch (switchError) {
      // Type guard cho error
      if (
        switchError &&
        typeof switchError === 'object' &&
        'code' in switchError &&
        switchError.code === 4902
      ) {
        try {
          // Thêm mạng mới vào MetaMask
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CHAIN_CONFIG as AddEthereumChainParameter],
          });
        } catch (addError) {
          console.error('Error adding chain:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching chain:', switchError);
        throw switchError;
      }
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!sdk?.isInitialized()) {
        throw new Error('SDK not initialized');
      }

      const ethereum = sdk.getProvider();

      const accounts = await ethereum?.request({
        method: 'eth_requestAccounts'
      }) as string[];

      if (accounts?.length > 0) {
        await switchNetwork(ethereum as EthereumProvider);

        const chainId = await ethereum?.request({
          method: 'eth_chainId'
        }) as string;

        setWalletState({
          accounts,
          chainId,
          connected: true,
          isMetaMask: true
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      const mmError = error as MetaMaskError;
      setError(mmError.message || 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    sdk?.terminate();
    setWalletState({
      accounts: [],
      chainId: null,
      connected: false,
      isMetaMask: false
    });
  };

  const signMessage = async () => {
    try {
      if (!sdk?.isInitialized()) {
        throw new Error('SDK not initialized');
      }

      const ethereum = sdk.getProvider() as EthereumProvider;

      if (!walletState.accounts[0]) {
        throw new Error('Please connect wallet first');
      }

      const timestamp = Date.now();
      const message = `Sign in to our dApp\n\nOrigin: ${window.location.origin}\nTimestamp: ${timestamp}`;

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, walletState.accounts[0]]
      }) as string;

      setSignature(signature);
      console.log('Signature:', signature);

      // Lưu signature vào localStorage nếu cần
      localStorage.setItem('lastSignature', JSON.stringify({
        signature,
        timestamp,
        account: walletState.accounts[0]
      }));

      return true;
    } catch (error) {
      console.error('Signing error:', error);
      const mmError = error as MetaMaskError;
      setError(mmError.message || 'Failed to sign message');
      return false;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">MetaMask Connection</h2>
        {error && (
          <p className="text-red-500 mb-2">{error}</p>
        )}
        {serviceStatus?.connectionStatus === ConnectionStatus.WAITING && (
          <p className="text-yellow-500">Waiting for MetaMask connection...</p>
        )}
        <p className="text-gray-600">
          {walletState.accounts[0]
            ? `Connected: ${walletState.accounts[0].slice(0, 6)}...${walletState.accounts[0].slice(-4)}`
            : 'Not connected'}
        </p>
      </div>

      {walletState.connected ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={disconnect}
            className="rounded-full border border-gray-300 px-6 py-2 
                     font-semibold transition-colors hover:bg-gray-100"
          >
            Disconnect
          </button>

          <button
            onClick={signMessage}
            className="rounded-full bg-green-600 text-white px-6 py-2 
                     font-semibold transition-all hover:bg-green-700"
          >
            Sign Message
          </button>

          {signature && (
            <p className="text-sm text-gray-500 mt-2">
              Message signed successfully! ✓
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isLoading}
          className={`rounded-full bg-blue-600 text-white px-6 py-2 
                     font-semibold transition-all hover:bg-blue-700
                     ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
}