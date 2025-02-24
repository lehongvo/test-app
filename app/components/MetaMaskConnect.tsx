'use client';

import { useCallback, useEffect, useState } from 'react';

export default function MetaMaskConnect() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const checkWeb3Availability = useCallback(() => {
    if (typeof window !== 'undefined') {
      const { ethereum } = window;
      const isMobile = isMobileDevice();

      if (isMobile) {
        if (!ethereum && !window.hasOwnProperty('ethereum')) {
          setShowInstallModal(true);
        }
      } else {
        if (!ethereum) {
          setShowInstallModal(true);
        }
      }
    }
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setUserAccount(null);
    } else {
      setUserAccount(accounts[0]);
    }
  }, []);

  useEffect(() => {
    checkWeb3Availability();

    const ethereum = window.ethereum;
    if (ethereum?.on) {
      ethereum.on('accountsChanged', handleAccountsChanged);
    }

    // Check initial accounts
    if (ethereum?.request) {
      ethereum.request({ method: 'eth_accounts' })
        .then((accounts: unknown) => {
          if (Array.isArray(accounts) && accounts.length > 0) {
            setUserAccount(accounts[0]);
          }
        })
        .catch(console.error);
    }

    return () => {
      if (ethereum?.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [handleAccountsChanged, checkWeb3Availability]);

  const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  const getDappUrl = () => {
    return typeof window !== 'undefined'
      ? encodeURIComponent(window.location.host)
      : '';
  };

  const handleInstallClick = () => {
    if (isMobileDevice()) {
      const dappUrl = getDappUrl();
      if (dappUrl) {
        const metamaskAppLink = `https://metamask.app.link/dapp/${dappUrl}`;
        window.location.href = metamaskAppLink;
      }
    } else {
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  const connectMetaMask = async () => {
    try {
      let provider: EthereumProvider | undefined;

      if (typeof window.ethereum !== 'undefined') {
        provider = window.ethereum;
      } else if (window.hasOwnProperty('ethereum')) {
        provider = window.ethereum;
      }

      if (provider) {
        try {
          const accounts = await provider.request({
            method: 'eth_requestAccounts',
          }) as string[];

          setUserAccount(accounts[0]);
          setShowInstallModal(false);
        } catch (err) {
          console.error('User rejected connection:', err);
        }
      } else {
        if (isMobileDevice()) {
          const dappUrl = getDappUrl();
          if (dappUrl) {
            window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
          }
        } else {
          setShowInstallModal(true);
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleDisconnect = () => {
    setUserAccount(null);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">MetaMask Connection</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {userAccount
              ? `Connected: ${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`
              : 'Disconnected'}
          </p>
        </div>

        {!userAccount && (
          <button
            onClick={connectMetaMask}
            className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 
                     font-semibold transition-all hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Connect Wallet
          </button>
        )}

        {userAccount && (
          <button
            onClick={handleDisconnect}
            className="rounded-full border border-black/[.08] dark:border-white/[.145] px-6 py-3
                     font-semibold transition-colors hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Install MetaMask Modal */}
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
                onClick={handleInstallClick}
                className="w-full rounded-full bg-blue-600 text-white px-6 py-3 
                         font-semibold transition-all hover:bg-blue-700"
              >
                {isMobileDevice() ? "Open MetaMask" : "Install MetaMask"}
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