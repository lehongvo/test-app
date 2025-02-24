'use client';

import { useEffect, useState } from 'react';

export default function MetaMaskConnect() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      setIsMetaMaskInstalled(true);
      
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else {
          setUserAccount(accounts[0]);
        }
      });
    }
  }, []);

  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        }) as string[];
        
        setUserAccount(accounts[0]);
      } catch (error) {
        console.error('Error connecting:', error);
      }
    } else {
      alert('MetaMask is not installed. Please install MetaMask.');
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
        alert('Failed to disconnect. Please try manually from MetaMask.');
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
          disabled={!isMetaMaskInstalled}
          className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 
                   font-semibold transition-all hover:bg-gray-800 dark:hover:bg-gray-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Connect to MetaMask
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