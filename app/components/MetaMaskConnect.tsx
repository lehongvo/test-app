"use client";

import { MetaMaskSDK, SDKProvider } from '@metamask/sdk';
import { useEffect, useState } from 'react';

// Thêm interface cho MetaMask error
interface MetaMaskError extends Error {
  code: number;
  message: string;
}

const MetaMaskConnect = () => {
  const [account, setAccount] = useState<string>('');
  const [sdk, setSDK] = useState<MetaMaskSDK>();
  const [provider, setProvider] = useState<SDKProvider | undefined>();
  const [connected, setConnected] = useState(false);
  const [chain, setChain] = useState('');

  useEffect(() => {
    const initSDK = async () => {
      const MMSDK = new MetaMaskSDK({
        dappMetadata: {
          name: "My Dapp",
          url: window.location.href,
        },
        checkInstallationImmediately: true,
        logging: {
          developerMode: false,
        },
        storage: {
          enabled: true,
        },
        useDeeplink: true,
        preferDesktop: false,
      });

      await MMSDK.init();
      const provider = MMSDK.getProvider();

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (provider?.isMetaMask && isMobile) {
        setSDK(MMSDK);
        setProvider(provider);
      } else {
        setSDK(MMSDK);
        setProvider(provider);
      }
    };

    initSDK();
  }, []);

  useEffect(() => {
    if (!sdk || !provider) {
      return;
    }

    if (provider.getSelectedAddress()) {
      setAccount(provider.getSelectedAddress() ?? '');
      setConnected(true);
    } else {
      setConnected(false);
    }

    const onChainChanged = (...args: unknown[]) => {
      const chain = args[0] as string;
      setChain(chain);
      setConnected(true);
    };

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts?.[0]) {
        setAccount(accounts[0]);
        setConnected(true);
      } else {
        setAccount('');
        setConnected(false);
      }
    };

    const onConnect = (...args: unknown[]) => {
      const connectInfo = args[0] as { chainId: string };
      setConnected(true);
      setChain(connectInfo.chainId);
    };

    const onDisconnect = () => {
      setConnected(false);
      setChain('');
      setAccount('');
    };

    provider.on('chainChanged', onChainChanged);
    provider.on('accountsChanged', onAccountsChanged);
    provider.on('connect', onConnect);
    provider.on('disconnect', onDisconnect);

    return () => {
      provider.removeListener('chainChanged', onChainChanged);
      provider.removeListener('accountsChanged', onAccountsChanged);
      provider.removeListener('connect', onConnect);
      provider.removeListener('disconnect', onDisconnect);
    };
  }, [sdk, provider]);

  const connect = async () => {
    try {
      if (!provider) {
        throw new Error('Provider không hợp lệ');
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
          params: [],
        }) as string[];

        if (accounts?.[0]) {
          setAccount(accounts[0]);
          setConnected(true);
        }
      } else {
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
          params: [],
        }) as string[];

        if (accounts?.[0]) {
          setAccount(accounts[0]);
          setConnected(true);
        }
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      // Sử dụng type assertion với interface đã định nghĩa
      if ((error as MetaMaskError)?.code === 4001) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = 'https://metamask.app.link/dapp/' + window.location.host;
        }
      }
    }
  };

  const disconnect = () => {
    setConnected(false);
    setAccount('');
    setChain('');
  };

  const signMessage = async () => {
    try {
      if (!account || !provider) {
        alert('Vui lòng kết nối ví trước!');
        return;
      }

      const signature = await provider.request({
        method: 'personal_sign',
        params: ['hello', account]
      });

      console.log('Chữ ký:', signature);
      alert('Ký message thành công! Xem console để biết chi tiết.');
    } catch (error) {
      console.error('Lỗi khi ký message:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex flex-col items-center space-y-4">
          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-800">MetaMask SDK Demo</h1>

          {/* Status Section */}
          <div className="w-full space-y-3 mb-4">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <span className="text-gray-600">Trạng thái</span>
              <span className={`font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
                {connected ? 'Đã kết nối' : 'Chưa kết nối'}
              </span>
            </div>

            {chain && (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-600">Mạng</span>
                <span className="font-medium text-blue-600">{chain}</span>
              </div>
            )}

            {account && (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-600">Địa chỉ ví</span>
                <span className="font-medium text-gray-800">
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {!connected ? (
              <button
                onClick={connect}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
                <span>Kết nối với MetaMask</span>
              </button>
            ) : (
              <>
                <button
                  onClick={signMessage}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Ký message &apos;hello&apos;
                </button>
                <button
                  onClick={disconnect}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Ngắt kết nối
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetaMaskConnect;