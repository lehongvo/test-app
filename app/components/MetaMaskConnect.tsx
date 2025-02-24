'use client';

import { useCallback, useEffect, useState } from 'react';

export default function MetaMaskConnect() {
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

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

      const handleConnect = () => {
        ethereum.request({ method: 'eth_accounts' })
          .then((accounts: unknown) => {
            if (Array.isArray(accounts) && accounts.length > 0) {
              setUserAccount(accounts[0]);
            }
          })
          .catch(console.error);
      };

      const handleDisconnectEvent = () => {
        setUserAccount(null);
      };

      ethereum.on('connect', handleConnect);
      ethereum.on('disconnect', handleDisconnectEvent);

      // Cleanup
      return () => {
        if (ethereum?.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('connect', handleConnect);
          ethereum.removeListener('disconnect', handleDisconnectEvent);
        }
      };
    }

    return undefined;
  }, [handleAccountsChanged, checkWeb3Availability]);

  const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  const getDappUrl = () => {
    return typeof window !== 'undefined'
      ? encodeURIComponent(window.location.host)
      : '';
  };

  const handleInstallClick = async () => {
    if (isMobileDevice()) {
      const hasMetaMask = await checkForMetaMaskMobile();
      if (hasMetaMask) {
        await connectMetaMask();
      } else {
        window.location.href = 'https://metamask.io/download/';
      }
    } else {
      window.open('https://metamask.io/download/', '_blank');
    }
  };

  const signMessage = async (account: string) => {
    try {
      if (window.ethereum?.request) {
        const message = 'Sign messgae with link: https://test-app-six-amber.vercel.app/';
        // Yêu cầu ký message
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, account]
        });

        setSignature(signature as string);
        console.log('Signature:', signature);
      }
    } catch (error) {
      console.error('Error signing message:', error);
      // Nếu user từ chối ký, disconnect
      setUserAccount(null);
      alert('Signature is required to use this application');
    }
  };

  const connectMetaMask = async () => {
    try {
      if (isMobileDevice()) {
        const dappUrl = getDappUrl();
        const metamaskAppLink = `https://metamask.app.link/dapp/${dappUrl}?action=connect`;

        window.location.href = metamaskAppLink;
        return;
      }

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

          await signMessage(accounts[0]);
        } catch (err) {
          console.error('User rejected connection:', err);
        }
      } else {
        setShowInstallModal(true);
      }
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (window.ethereum?.request) {
        if (isMobileDevice()) {
          try {
            // Yêu cầu permissions mới để force disconnect
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });

            // Kiểm tra lại accounts sau khi request permissions
            const accounts = await window.ethereum.request({
              method: 'eth_accounts'
            }) as string[];

            // Nếu không còn account nào được kết nối
            if (!accounts || accounts.length === 0) {
              setUserAccount(null);
            }

            // Thông báo cho user
            alert('Please open MetaMask app and disconnect manually to complete the process. Then return to this app.');

            // Mở MetaMask app
            const dappUrl = getDappUrl();
            if (dappUrl) {
              window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
            }
          } catch (error) {
            console.error('Error requesting permissions:', error);
            setUserAccount(null);
          }
        } else {
          // Desktop flow
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
          setUserAccount(null);
        }
      }
      setSignature(null); // Reset signature when disconnecting
    } catch (error) {
      console.error('Error disconnecting:', error);
      setUserAccount(null);
      setSignature(null);
    }
  };

  const checkForMetaMaskMobile = () => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);

      if (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      ) {
        if (window.ethereum?.isMetaMask) {
          clearTimeout(timeout);
          resolve(true);
        }
      }
    });
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum?.request) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          }) as string[];

          if (accounts.length > 0) {
            setUserAccount(accounts[0]);
            await signMessage(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

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
          {signature && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Message signed ✓
            </p>
          )}
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