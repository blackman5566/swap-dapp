'use client';

import { useTranslation } from "react-i18next";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';

// =====================
// 🧪 localhost 測試鏈備用設定（需要時取消註解）
// =====================
// const localhost = defineChain({
//   id: 31337,
//   name: 'Hardhat Local',
//   nativeCurrency: {
//     name: 'Ether',
//     symbol: 'ETH',
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: ['http://127.0.0.1:8545'], // 改成本機端 RPC
//     },
//   },
// });

// const localhostconfig = getDefaultConfig({
//   appName: 'Swap DApp',
//   projectId: 'your-walletconnect-project-id',
//   chains: [localhost],
//   transports: {
//     [localhost.id]: http('http://127.0.0.1:8545'),
//   },
// });
// =====================
// 🔗 Ethereum Sepolia 測試鏈
// =====================
const sepolia = defineChain({
  id: 11155111,
  name: 'Ethereum Sepolia',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://eth-sepolia.g.alchemy.com/v2/api_key'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io/' }
  }
});

// =====================
// 🔗 Arbitrum Sepolia 測試鏈
// =====================
const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'Arbitrum Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia-rollup.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io/' },
  },
  testnet: true,
});

// =====================
// ⚙️ 設定 wagmi + RainbowKit Config
// =====================
const config = getDefaultConfig({
  appName: 'Swap DApp',
  projectId: 'WalletConnect Cloud Project ID', // WalletConnect Cloud Project ID
  chains: [sepolia, arbitrumSepolia],
  transports: {
    [sepolia.id]: http('https://sepolia.infura.io/v3/key'),
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
});

// =====================
// 🔁 React Query Client
// =====================
const queryClient = new QueryClient();

// =====================
// 🧩 Web3Provider: 包住整個 App 的 Provider 組合
// =====================
export default function Web3Provider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale={lang === 'en' ? 'en' : 'zh-TW'}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

