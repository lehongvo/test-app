'use client';

import { useEffect, useState } from 'react';

export default function MetaMaskConnect() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    checkWeb3Availability();
  }, []);

  const checkWeb3Availability = () => {
    if (typeof window !== 'undefined') {
      const { ethereum } = window;
      if (!ethereum) {
        setShowInstallModal(true);
      }
    }
  };

  const handleInstallClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Redirect to app store
      window.open('https://metamask.app.link/dapp/test-app-pink-psi.vercel.app', '_blank');
    } else {
      // Redirect to MetaMask extension
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
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        }) as string[];

        setUserAccount(accounts[0]);
      } else {
        setShowInstallModal(true);
      }
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleDisconnect = async () => {
    if (window.ethereum && window.ethereum.request) {
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
        setUserAccount(null);
      } catch (error) {
        console.error('Error disconnecting:', error);
        alert('Failed to disconnect. Please try manually from your wallet.');
      }
    }
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
              To connect your wallet, please install MetaMask first.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleInstallClick}
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