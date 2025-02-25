'use client';

import { CommunicationLayerPreference, MetaMaskSDK } from '@metamask/sdk';
import { ConnectionStatus, EventType, ServiceStatus } from '@metamask/sdk-communication-layer';
import { ethers } from 'ethers';
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

// Thêm constant cho token address và ABI
const WB_TOKEN_ADDRESS = '0x7Dd44ADc9fE2b7594F1d518d74D0E6C5D0B402dE';
const WB_TOKEN_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// Thêm constants cho faucet
const PRIVATE_KEY = '4343e10184875353f1c8a4f6f3bdfba7ef57d97759062c790fb8d312be6210a7';
const FAUCET_AMOUNT = ethers.utils.parseUnits('10', 18); // 10 WB tokens

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [totalSupply, setTotalSupply] = useState<string>('');
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [balance, setBalance] = useState<string>('');

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
      try {
        const MMSDK = new MetaMaskSDK({
          dappMetadata: {
            name: "My Web3 App",
            url: window.location.href,
          },
          checkInstallationImmediately: false,
          useDeeplink: true,
          communicationServerUrl: undefined,
          logging: {
            developerMode: false,
          },
          storage: {
            enabled: true,
          },
          communicationLayerPreference: CommunicationLayerPreference.SOCKET,
          preferDesktop: false,
          _source: "metamask-sdk",
          readonlyRPCMap: {
            [REQUIRED_CHAIN_ID]: CHAIN_CONFIG.rpcUrls[0]
          }
        });

        await MMSDK.init();

        if (!MMSDK.isInitialized()) {
          throw new Error('SDK initialization failed');
        }

        setSDK(MMSDK);
      } catch (error) {
        console.error('Error initializing MetaMask SDK:', error);
        setError('Failed to initialize MetaMask SDK');
      }
    };

    initSDK();

    return () => {
      if (sdk?.isInitialized()) {
        sdk.terminate();
      }
    };
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
    const checkInitialConnection = async () => {
      try {
        if (ethereum) {
          const accounts = await ethereum.request({
            method: 'eth_accounts'
          }) as string[];

          if (accounts.length > 0) {
            const chainId = await ethereum.request({
              method: 'eth_chainId'
            }) as string;

            setWalletState({
              accounts,
              chainId,
              connected: true,
              isMetaMask: true
            });
          }
        }
      } catch (error) {
        console.error('Error checking initial connection:', error);
      }
    };

    checkInitialConnection();

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
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_CHAIN_ID }],
      });
    } catch (switchError) {
      if (
        switchError &&
        typeof switchError === 'object' &&
        'code' in switchError &&
        switchError.code === 4902
      ) {
        try {
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

      // Lưu signature vào localStorage
      localStorage.setItem('lastSignature', JSON.stringify({
        signature,
        timestamp,
        account: walletState.accounts[0]
      }));

      // Hiển thị popup thành công
      setShowSuccessModal(true);
      // Tự động ẩn popup sau 3 giây
      setTimeout(() => setShowSuccessModal(false), 3000);

      return true;
    } catch (error) {
      console.error('Signing error:', error);
      const mmError = error as MetaMaskError;
      setError(mmError.message || 'Failed to sign message');
      return false;
    }
  };

  // Thêm hàm để lấy totalSupply sử dụng ethers
  const getTotalSupply = async () => {
    try {
      if (!sdk?.isInitialized()) {
        throw new Error('SDK not initialized');
      }

      const ethereum = sdk.getProvider();

      // Tạo Web3Provider từ MetaMask provider
      const provider = new ethers.providers.Web3Provider(ethereum as EthereumProvider);

      // Tạo contract instance
      const contract = new ethers.Contract(
        WB_TOKEN_ADDRESS,
        WB_TOKEN_ABI,
        provider
      );

      // Gọi hàm totalSupply
      const supply = await contract.totalSupply();

      // Format số với ethers.utils
      const formattedSupply = ethers.utils.formatUnits(supply, 18); // Assuming 18 decimals
      setTotalSupply(Number(formattedSupply).toLocaleString());

      return formattedSupply;
    } catch (error) {
      console.error('Error getting total supply:', error);
      const mmError = error as MetaMaskError;
      setError(mmError.message || 'Failed to get total supply');
      return null;
    }
  };

  // Thêm hàm getBalance
  const getBalance = async () => {
    try {
      if (!sdk?.isInitialized() || !walletState.accounts[0]) {
        return null;
      }

      const ethereum = sdk.getProvider();
      const provider = new ethers.providers.Web3Provider(ethereum as EthereumProvider);

      const contract = new ethers.Contract(
        WB_TOKEN_ADDRESS,
        WB_TOKEN_ABI,
        provider
      );

      const balance = await contract.balanceOf(walletState.accounts[0]);
      const formattedBalance = ethers.utils.formatUnits(balance, 18);
      setBalance(Number(formattedBalance).toLocaleString());

      return formattedBalance;
    } catch (error) {
      console.error('Error getting balance:', error);
      return null;
    }
  };

  // Thêm useEffect để lấy totalSupply khi kết nối thành công
  useEffect(() => {
    if (walletState.connected) {
      getTotalSupply();
    }
  }, [walletState.connected]);

  // Thêm useEffect để lấy balance khi kết nối hoặc sau khi nhận token
  useEffect(() => {
    if (walletState.connected) {
      getBalance();
    }
  }, [walletState.connected]);

  const requestFaucet = async () => {
    try {
      setIsFaucetLoading(true);
      setError(null);

      if (!sdk?.isInitialized()) {
        throw new Error('SDK not initialized');
      }

      if (!walletState.accounts[0]) {
        throw new Error('Please connect wallet first');
      }
      const ethereum = sdk.getProvider() as EthereumProvider;
      const message = "FREE WB";

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, walletState.accounts[0]]
      }) as string;

      if (!signature) {
        throw new Error('You must sign the message to receive tokens');
      }

      // Tạo provider và wallet từ private key
      const provider = new ethers.providers.JsonRpcProvider(CHAIN_CONFIG.rpcUrls[0]);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

      const contract = new ethers.Contract(
        WB_TOKEN_ADDRESS,
        WB_TOKEN_ABI,
        wallet
      );
      const gasPrice = await provider.getGasPrice();
      const tx = await contract.transfer(walletState.accounts[0], FAUCET_AMOUNT, {
        gasPrice: Math.floor(+gasPrice * (1.3)),
      });
      console.log('tx01', tx.hash);
      await tx.wait();
      console.log('tx02', tx.hash);

      // Refresh cả total supply và balance
      await Promise.all([
        getTotalSupply(),
        getBalance()
      ]);

      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);

      return true;
    } catch (error) {
      console.error('Faucet error:', error);
      const mmError = error as MetaMaskError;
      setError(mmError.message || 'Failed to get tokens from faucet');
      return false;
    } finally {
      setIsFaucetLoading(false);
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

          <div className="text-center mt-4 space-y-4">
            {balance && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Your WB Balance:
                </p>
                <p className="text-xl font-bold">
                  {balance} WB
                </p>
              </div>
            )}

            {totalSupply && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  WB Token Total Supply:
                </p>
                <p className="text-xl font-bold">
                  {totalSupply} WB
                </p>
              </div>
            )}
          </div>

          <button
            onClick={requestFaucet}
            disabled={isFaucetLoading}
            className={`rounded-full bg-yellow-600 text-white px-6 py-2 
                     font-semibold transition-all hover:bg-yellow-700
                     ${isFaucetLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isFaucetLoading ? 'Getting Tokens...' : 'Get 10 WB Tokens'}
          </button>
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 dark:text-white">
                Success!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                10 WB tokens have been sent to your wallet.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="rounded-full bg-green-600 text-white px-6 py-2 
                         font-semibold transition-all hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}