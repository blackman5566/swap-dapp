'use client'

// 匯入必要函式與元件
import { useAccount, useReadContracts } from 'wagmi'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AssetTokens from '@/app/features/assets/AssetTokens'
import RequireWalletConnected from '@/app/components/RequireWalletConnected'
import type { Abi } from 'abitype';
import TokenABI from '@/app/abi/ERC20.json' assert { type: 'json' };
const ERC20_ABI = TokenABI as Abi;

// 預設展示的 4 個代幣
const LOCAL_TOKENS = [
  {
    contract_address: process.env.NEXT_PUBLIC_SWAPX_ADDRESS! as string,
    contract_name: 'SwapX',
    contract_ticker_symbol: 'SWX',
    logo_url: '/assets/token/swx.png',
    decimals: 18,
  },
  {
    contract_address: process.env.NEXT_PUBLIC_GOLDX_ADDRESS! as string,
    contract_name: 'GoldX',
    contract_ticker_symbol: 'GOX',
    logo_url: '/assets/token/gox.png',
    decimals: 18,
  },
  {
    contract_address: process.env.NEXT_PUBLIC_ENERGYCOIN_ADDRESS! as string,
    contract_name: 'EnergyCoin',
    contract_ticker_symbol: 'EGC',
    logo_url: '/assets/token/egc.png',
    decimals: 18,
  },
  {
    contract_address: process.env.NEXT_PUBLIC_USDT_ADDRESS! as string,
    contract_name: 'USDT',
    contract_ticker_symbol: 'USDT',
    logo_url: '/assets/token/egc.png',
    decimals: 18,
  },
]

export default function AssetPage() {
  const { t } = useTranslation()
  const { address } = useAccount()
  const [tab, setTab] = useState<'tokens' | 'nfts'>('tokens')
  const [copied, setCopied] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [displayUsd, setDisplayUsd] = useState(0)

  // 準備讀取所有代幣餘額
  const contracts = LOCAL_TOKENS.map(token => ({
    address: token.contract_address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
  }))

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled: !!address }, // 有地址才讀
  })

  // 組合代幣資料（含餘額與預設報價）
  const tokens = LOCAL_TOKENS.map((token, i) => {
    const balanceResult = data?.[i];
    const balance =
      balanceResult?.status === 'success'
        ? balanceResult.result?.toString?.() || '0'
        : '0';
    return {
      ...token,
      balance,
      quote: null, // 假資料，未連結報價 API
    };
  });

  // 計算總資產 USD 金額（模擬）
  const totalUsd = tokens.reduce((acc, t) => acc + (typeof t.quote === 'number' ? t.quote : 0), 0)
  useEffect(() => setDisplayUsd(totalUsd), [totalUsd])

  // 點擊複製錢包地址
  const handleCopy = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 py-8 text-slate-900 dark:text-white">
      <RequireWalletConnected>
        {/* 錢包資訊卡片 */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl md:text-4xl font-bold select-none">
                {showBalance ? `$${displayUsd.toFixed(2)}` : '****'}
              </span>
              <button onClick={() => setShowBalance(v => !v)}>
                {showBalance ? <Eye className="w-5 h-5 text-gray-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img
              src="https://assets.coingecko.com/coins/images/279/large/ethereum.png"
              alt="ETH"
              className="h-8 w-8"
            />
            <div className="text-xs text-gray-400 dark:text-gray-400 flex items-center gap-1 relative font-mono">
              <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              <button onClick={handleCopy}>
                <Copy className="w-4 h-4 hover:text-blue-500" />
              </button>
              {copied && (
                <span className="absolute left-0 top-6 text-green-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs shadow-lg animate-fade-in-out">
                  {t('copied_success')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab 切換 */}
        <div className="flex justify-center gap-6 md:gap-8 mb-2">
          <button
            className={`text-lg font-bold pb-1 border-b-2 transition-colors ${
              tab === 'tokens'
                ? 'border-blue-500 text-slate-900 dark:text-white'
                : 'border-transparent text-gray-400 hover:text-blue-400'
            }`}
            onClick={() => setTab('tokens')}
          >
            Tokens
          </button>
        </div>

        {/* 主內容區塊 */}
        <AssetTokens showBalance={showBalance} loading={isLoading} tokens={tokens} />
      </RequireWalletConnected>
    </div>
  )
}
