import { MetaMaskSDK, SDKProvider } from '@metamask/sdk';
import { useEffect, useState } from 'react';

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
                checkInstallationImmediately: false,
                logging: {
                    developerMode: false,
                },
                storage: {
                    enabled: true,
                },
            });

            await MMSDK.init();
            setSDK(MMSDK);
            setProvider(MMSDK.getProvider());
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

            const accounts = await provider.request({
                method: 'eth_requestAccounts',
                params: [],
            }) as string[];

            if (accounts?.[0]) {
                setAccount(accounts[0]);
                setConnected(true);
            }
        } catch (error) {
            console.error('Lỗi kết nối:', error);
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