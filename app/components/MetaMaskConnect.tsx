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
    <div>
      <h1>MetaMask SDK Demo</h1>
      <div>
        {chain && <p>Mạng đang kết nối: {chain}</p>}
        {account && <p>Địa chỉ ví: {account}</p>}
        <p>Trạng thái: {connected ? 'Đã kết nối' : 'Chưa kết nối'}</p>
      </div>

      {!connected ? (
        <button onClick={connect}>Kết nối với MetaMask</button>
      ) : (
        <>
          <button onClick={disconnect}>Ngắt kết nối</button>
          <button onClick={signMessage}>Ký message &apos;hello&apos;</button>
        </>
      )}
    </div>
  );
};

export default MetaMaskConnect;