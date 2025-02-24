'use client';

import { useEffect, useState } from 'react';

export default function MetaMaskConnect() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [isWeb3Available, setIsWeb3Available] = useState(false);

  useEffect(() => {
    checkWeb3Availability();
  }, []);

  const checkWeb3Availability = () => {
    // Check for various Web3 providers
    if (typeof window !== 'undefined') {
      const { ethereum } = window;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (ethereum) {
        setIsWeb3Available(true);
      } else if (isMobile) {
        // For mobile devices without MetaMask
        if (window.hasOwnProperty('ethereum')) {
          setIsWeb3Available(true);
        } else {
          // Redirect to MetaMask mobile app
          const link = document.createElement('a');
          link.href = 'https://metamask.app.link/dapp/your-website-url.com'; // Replace with your website URL
          link.click();
        }
      }
    }
  };

  const connectMetaMask = async () => {
    try {
      let provider;
      if (typeof window.ethereum !== 'undefined') {
        provider = window.ethereum;
      } else if (window.hasOwnProperty('ethereum')) {
        provider = (window as any).ethereum;
      }

      if (provider) {
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        }) as string[];

        setUserAccount(accounts[0]);
      } else {
        // For mobile browsers without Web3
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.open('https://metamask.app.link/dapp/your-website-url.com', '_blank'); // Replace with your website URL
        } else {
          alert('Please install MetaMask to connect.');
        }
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
          disabled={!isWeb3Available}
          className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 
                   font-semibold transition-all hover:bg-gray-800 dark:hover:bg-gray-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
} 