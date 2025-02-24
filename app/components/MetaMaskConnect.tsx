'use client';

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

export default function MetaMaskConnect() {
  const [walletState, setWalletState] = useState<WalletState>({
    accounts: [],
    chainId: null,
    connected: false,
    isMetaMask: false
  });
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Constants
  const REQUIRED_CHAIN_ID = '0x1'; // Mainnet - Change as needed
  const DEEP_LINK_PREFIX = 'https://metamask.app.link/';

  const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  const getDeepLink = () => {
    const currentUrl = typeof window !== 'undefined'
      ? window.location.href
      : '';
    // Remove any existing deep link parameters
    const cleanUrl = currentUrl.split('?')[0];
    return `${DEEP_LINK_PREFIX}dapp/${encodeURIComponent(cleanUrl)}`;
  };

  const checkMetaMaskInstallation = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      const checkProvider = () => {
        if (window.ethereum?.isMetaMask) {
          clearTimeout(timeout);
          resolve(true);
        }
      };

      // Check immediately
      checkProvider();

      // Also set up a listener for provider injection
      window.addEventListener('ethereum#initialized', checkProvider, { once: true });
    });
  };

  const checkNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== REQUIRED_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: REQUIRED_CHAIN_ID }],
          });
          return true;
        } catch (error: unknown) {
          const walletError = error as MetaMaskError;
          if (walletError.code === 4902) {
            setError('Please add Ethereum network to your wallet');
          }
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  };

  const handleMobileConnection = async () => {
    const hasMetaMask = await checkMetaMaskInstallation();

    if (hasMetaMask) {
      // MetaMask is installed, proceed with connection
      return connectWithMetaMask();
    } else {
      // Redirect to MetaMask with return URL
      const deepLink = getDeepLink();
      window.location.href = deepLink;
      return false;
    }
  };

  const signMessage = async (account: string): Promise<boolean> => {
    try {
      if (!window.ethereum?.request) return false;

      const timestamp = Date.now();
      const message = `Sign in to our dApp\n\nOrigin: ${window.location.origin}\nTimestamp: ${timestamp}`;

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });

      if (signature) {
        setSignature(signature as string);
        localStorage.setItem('lastSignature', JSON.stringify({
          signature,
          timestamp,
          account
        }));
        return true;
      }
      return false;
    } catch (error: unknown) {
      const walletError = error as MetaMaskError;
      if (walletError.code === 4001) {
        setError('Please sign the message to continue');
      } else {
        setError('Error signing message. Please try again.');
      }
      return false;
    }
  };

  const connectWithMetaMask = async () => {
    if (!window.ethereum) {
      setShowInstallModal(true);
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const correctNetwork = await checkNetwork();
      if (!correctNetwork) return false;

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: 'eth_chainId'
        }) as string;

        setWalletState({
          accounts,
          chainId,
          connected: true,
          isMetaMask: window.ethereum.isMetaMask || false
        });

        await signMessage(accounts[0]);
        return true;
      }
      return false;
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const walletError = error as MetaMaskError;
      if (walletError.code === 4001) {
        setError('Please accept the connection request');
      } else {
        setError('Error connecting wallet. Please try again.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isMobileDevice()) {
        await handleMobileConnection();
      } else {
        await connectWithMetaMask();
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isMobileDevice()) {
        // On mobile, just clear the state and inform user
        setWalletState({
          accounts: [],
          chainId: null,
          connected: false,
          isMetaMask: false
        });
        setSignature(null);
        localStorage.removeItem('lastSignature');

        // Redirect to MetaMask app for manual disconnect
        alert('Please open MetaMask app to disconnect');
        window.location.href = DEEP_LINK_PREFIX;
      } else {
        // On desktop, try to revoke permissions
        if (window.ethereum?.request) {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
        }

        setWalletState({
          accounts: [],
          chainId: null,
          connected: false,
          isMetaMask: false
        });
        setSignature(null);
        localStorage.removeItem('lastSignature');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Error disconnecting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletState(prev => ({
          ...prev,
          accounts: [],
          connected: false
        }));
        setSignature(null);
      } else {
        setWalletState(prev => ({
          ...prev,
          accounts,
          connected: true
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWalletState(prev => ({
        ...prev,
        chainId
      }));

      if (chainId !== REQUIRED_CHAIN_ID) {
        setError('Please switch to Ethereum Mainnet');
      } else {
        setError(null);
      }
    };

    const handleConnect = () => {
      setWalletState(prev => ({
        ...prev,
        connected: true
      }));
    };

    const handleDisconnect = () => {
      setWalletState({
        accounts: [],
        chainId: null,
        connected: false,
        isMetaMask: false
      });
      setSignature(null);
    };

    // Add event listeners
    const ethereum = window.ethereum;
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    ethereum.on('connect', handleConnect);
    ethereum.on('disconnect', handleDisconnect);

    // Check initial connection
    ethereum.request({ method: 'eth_accounts' })
      .then((result: unknown) => {
        // Type guard for the response
        if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
          if (result.length > 0) {
            handleAccountsChanged(result);
          }
        }
      })
      .catch(console.error);

    // Cleanup function
    return () => {
      const provider = window.ethereum;
      if (provider) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
        provider.removeListener('connect', handleConnect);
        provider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [REQUIRED_CHAIN_ID]); // Add REQUIRED_CHAIN_ID to dependencies

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">MetaMask Connection</h2>
          {error && (
            <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
          )}
          <p className="text-gray-600 dark:text-gray-400">
            {walletState.accounts[0]
              ? `Connected: ${walletState.accounts[0].slice(0, 6)}...${walletState.accounts[0].slice(-4)}`
              : 'Disconnected'}
          </p>
          {signature && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Message signed ✓
            </p>
          )}
          {walletState.chainId && walletState.chainId !== REQUIRED_CHAIN_ID && (
            <p className="text-yellow-500 dark:text-yellow-400 mt-2">
              Please switch to Ethereum Mainnet
            </p>
          )}
        </div>

        {!walletState.connected && (
          <button
            onClick={connect}
            disabled={isLoading}
            className={`rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 
                     font-semibold transition-all hover:bg-gray-800 dark:hover:bg-gray-200
                     ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}

        {walletState.connected && (
          <button
            onClick={disconnect}
            disabled={isLoading}
            className={`rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-3
                     font-semibold transition-colors hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]
                     ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        )}
      </div>

      {showInstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">
              MetaMask Not Detected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              {isMobileDevice()
                ? "Install MetaMask on your mobile device to connect"
                : "To connect your wallet, please install MetaMask first"}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.href = 'https://metamask.io/download/';
                }}
                className="w-full rounded-full bg-blue-600 text-white px-6 py-3 
                         font-semibold transition-all hover:bg-blue-700"
              >
                Install MetaMask
              </button>
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full rounded-full border border-gray-300 dark:border-gray-600 
                         px-6 py-3 font-semibold transition-colors 
                         hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}