'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { parseEther, formatEther } from 'viem'
import { useTranslation } from 'react-i18next'

import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract
} from 'wagmi'
import { ethers } from 'ethers'
import { injected } from '@wagmi/connectors'
import RouterABI from '@/app/abi/Router.json'
import TokenABI from '@/app/abi/ERC20.json'
import FactoryABI from '@/app/abi/Factory.json'
import PairABI from '@/app/abi/PairAMM.json'
import { Repeat } from 'lucide-react'

// ========== Token 型別 ==========
interface Token {
  label: string
  symbol: string
  address: `0x${string}`
}

// ========== Swap 錯誤枚舉，對應 i18n Key ==========
enum SwapError {
  None = '',
  InvalidAmount = 'swap.error.invalidAmount',
  InsufficientBalance = 'swap.error.insufficientBalance',
  NumberFormat = 'swap.error.numberFormat',
  Slippage = 'swap.error.slippage',
  TxFailed = 'swap.error.txFailed',
}

// ========== Swap 狀態型別 ==========
type SwapStatus = 'idle' | 'approving' | 'swapping' | 'success' | 'error'

// ========== 各合約位址環境變數 ==========
const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ROUTER_ADDRESS! as string
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS! as string
const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS! as string

// ========== TokenSelector 元件：下拉選單換 Token ==========
function TokenSelector({
  tokens,
  selected,
  onChange,
  disabledSymbol
}: {
  tokens: Token[]
  selected: string
  onChange: (symbol: string) => void
  disabledSymbol?: string
}) {
  return (
    <select
      className="w-full px-5 py-3 rounded-2xl border bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
      value={selected}
      onChange={e => onChange(e.target.value)}
    >
      {tokens.map(token => (
        <option
          key={token.symbol}
          value={token.symbol}
          disabled={token.symbol === disabledSymbol}
        >
          {token.label} ({token.symbol})
        </option>
      ))}
    </select>
  )
}

// ========== 輔助：傳入一組 tokens，回傳第一個不同於 current 的 symbol ==========
function getDifferentToken(current: string, tokens: Token[]): string {
  for (const t of tokens) {
    if (t.symbol !== current) return t.symbol
  }
  return current
}

// ========== 多跳匯率查詢邏輯，for 多幣種路徑 ==========
function useMultiHopRate(path: string[]) {
  const [rate, setRate] = useState<bigint | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (path.length < 2) {
      setRate(null)
      setError('Path too short')
      return
    }

    async function fetchRate() {
      try {
        if (!window.ethereum) throw new Error('Ethereum provider not found')
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, provider)

        let currentAmount = ethers.utils.parseEther('1') // 預設 1 單位做估價

        // 多跳計算每個 pair 的兌換結果
        for (let i = 0; i < path.length - 1; i++) {
          const fromToken = path[i]
          const toToken = path[i + 1]

          const pairAddress = await factory.getPair(fromToken, toToken)
          if (pairAddress === ethers.constants.AddressZero) {
            throw new Error(`Pair for ${fromToken} - ${toToken} not exist`)
          }

          const pairContract = new ethers.Contract(pairAddress, PairABI, provider)
          const reserves = await pairContract.getReservesFor(fromToken, toToken)
          const reserveIn = ethers.BigNumber.from(reserves[0].toString())
          const reserveOut = ethers.BigNumber.from(reserves[1].toString())
          if (reserveIn.isZero() || reserveOut.isZero()) {
            throw new Error(`No liquidity in pair ${pairAddress}`)
          }

          // AMM 定價公式，計算每段匯率
          currentAmount = currentAmount.mul(reserveOut).div(reserveIn.add(currentAmount))
        }

        setRate(BigInt(currentAmount.toString()))
        setError(null)
      } catch (e: any) {
        setRate(null)
        setError(e.message || 'Failed to fetch rate')
        console.error('[getRate error]', e)
      }
    }

    fetchRate()
  }, [path])

  return { rate, error }
}

// ========== SwapInterface 主要元件 ==========
export default function SwapInterface({
  addSwapRecord
}: {
  addSwapRecord: (record: {
    fromToken: string
    toToken: string
    fromAmount: string
    toAmount: string
    timestamp: number
  }) => void
}) {
  // ====== 支援的 Token 設定，環境變數讀入地址 ======
  const tokens: Token[] = useMemo(() => [
    { label: 'SwapX', symbol: 'SwapX', address: process.env.NEXT_PUBLIC_SWAPX_ADDRESS! as `0x${string}`},
    { label: 'GoldX', symbol: 'GoldX', address: process.env.NEXT_PUBLIC_GOLDX_ADDRESS! as `0x${string}`},
    { label: 'EnergyCoin', symbol: 'EnergyCoin', address: process.env.NEXT_PUBLIC_ENERGYCOIN_ADDRESS! as `0x${string}`},
    { label: 'USDT', symbol: 'USDT', address: process.env.NEXT_PUBLIC_USDT_ADDRESS! as `0x${string}`}
  ], [])

  // ====== 國際化 hook ======
  const { t } = useTranslation()

  // ====== 狀態 ======
  const [tokenFrom, setTokenFrom] = useState(tokens[0].symbol)         // 來源幣
  const [tokenTo, setTokenTo] = useState(tokens[1].symbol)             // 目標幣
  const [amountFrom, setAmountFrom] = useState('')                     // 輸入金額
  const [error, setError] = useState<SwapError>(SwapError.None)        // 錯誤訊息
  const [status, setStatus] = useState<SwapStatus>('idle')             // 流程狀態
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()    // 交易 hash
  const [isClient, setIsClient] = useState(false)                      // 僅 client 渲染

  // ====== 滑點（%），預設 1% ======
  const [slippage, setSlippage] = useState(1)

  // ====== wagmi hooks：錢包、連線、交易 ======
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { writeContractAsync } = useWriteContract()
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  // ====== 幣種詳細資料 ======
  const fromTokenInfo = useMemo(() => tokens.find(t => t.symbol === tokenFrom)!, [tokenFrom, tokens])
  const toTokenInfo = useMemo(() => tokens.find(t => t.symbol === tokenTo)!, [tokenTo, tokens])

  // ====== 來源幣餘額查詢 ======
  const { data: fromBalanceData } = useReadContract({
    address: fromTokenInfo.address,
    abi: TokenABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: isConnected }
  })
  const fromBalance = fromBalanceData as bigint | undefined

  // ====== 自動判斷路徑：直達/經 USDT ======
  const path = useMemo(() => {
    if (fromTokenInfo.address === USDT_ADDRESS || toTokenInfo.address === USDT_ADDRESS) {
      return [fromTokenInfo.address, toTokenInfo.address]
    }
    return [fromTokenInfo.address, USDT_ADDRESS, toTokenInfo.address]
  }, [fromTokenInfo.address, toTokenInfo.address])

  // ====== 多跳匯率查詢 hook ======
  const { rate, error: rateError } = useMultiHopRate(path)

  // ====== 兌換後數量，根據匯率與輸入金額動態換算 ======
  const amountTo = useMemo(() => {
    if (!amountFrom || !rate) return ''
    try {
      const fromBig = parseEther(amountFrom)
      const toBig = (fromBig * rate) / parseEther('1')
      return formatEther(toBig)
    } catch {
      return ''
    }
  }, [amountFrom, rate])

  // ====== 餘額不足判斷 ======
  const insufficientBalance = useMemo(() => {
    if (!fromBalance || !amountFrom) return false
    try {
      return parseEther(amountFrom) > fromBalance
    } catch {
      return false
    }
  }, [fromBalance, amountFrom])

  // ====== 判斷 client render，防止 SSR 報錯 ======
  useEffect(() => setIsClient(true), [])

  // ====== 地址短顯示 ======
  const displayAddress = useMemo(() => {
    if (!address) return null
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  // ====== 輸入/匯率/餘額變動時更新錯誤訊息 ======
  useEffect(() => {
    if (!amountFrom) return setError(SwapError.None)
    if (isNaN(Number(amountFrom)) || Number(amountFrom) <= 0) return setError(SwapError.InvalidAmount)
    if (insufficientBalance) return setError(SwapError.InsufficientBalance)
    if (rateError) return setError(SwapError.Slippage)
    setError(SwapError.None)
  }, [amountFrom, insufficientBalance, rateError])

  // ====== 交易成功自動清空金額 & 狀態 ======
  useEffect(() => {
    if (isTxSuccess) {
      setStatus('success')
      setAmountFrom('')
    }
  }, [isTxSuccess])

  // ====== 換 From 幣種，若跟 To 相同則 To 自動跳到其他幣 ======
  const handleSetTokenFrom = useCallback((symbol: string) => {
    setTokenFrom(symbol)
    if (symbol === tokenTo) {
      const newTo = getDifferentToken(symbol, tokens)
      setTokenTo(newTo)
    }
  }, [tokenTo, tokens])

  // ====== 換 To 幣種，若跟 From 相同則 From 自動跳到其他幣 ======
  const handleSetTokenTo = useCallback((symbol: string) => {
    setTokenTo(symbol)
    if (symbol === tokenFrom) {
      const newFrom = getDifferentToken(symbol, tokens)
      setTokenFrom(newFrom)
    }
  }, [tokenFrom, tokens])

  // ====== 處理金額輸入，只允許數字、小數點 ======
  const handleAmountFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim()
    if (val === '') return setAmountFrom('')
    if (!/^\d*\.?\d*$/.test(val)) return setError(SwapError.InvalidAmount)
    setAmountFrom(val)
  }, [])

  // ====== 交換 from/to 幣，金額也交換 ======
  const handleSwapDirection = useCallback(() => {
    setTokenFrom(tokenTo)
    setTokenTo(tokenFrom)
    setAmountFrom(amountTo)
  }, [amountTo, tokenFrom, tokenTo])

  // ====== 處理滑點變動，限 0.1~50% ======
  const handleSlippageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim()
    if (!/^\d*\.?\d*$/.test(val)) return
    if (val === '') {
      setSlippage(0)
      return
    }
    const num = Number(val)
    if (num < 0.1) setSlippage(0.1)
    else if (num > 50) setSlippage(50)
    else setSlippage(num)
  }, [])

  // ====== 一鍵設滑點 %（for 快速按鈕） ======
  const handleSetSlippage = useCallback((val: number) => {
    setSlippage(val)
  }, [])

  // ====== approve + swap 流程邏輯，包含滑點計算 ======
  const handleApproveAndSwap = useCallback(async () => {
    if (!amountFrom || Number(amountFrom) <= 0) {
      setError(SwapError.InvalidAmount)
      return
    }
    setError(SwapError.None)
    setStatus('approving')

    try {
      const amountIn = parseEther(amountFrom)
      // 先 approve
      await writeContractAsync({
        abi: TokenABI,
        address: fromTokenInfo.address,
        functionName: 'approve',
        args: [ROUTER_ADDRESS, amountIn]
      })

      setStatus('swapping')

      // 滑點參數 factor
      const slippageFactor = 1 - slippage / 100

      // 預期收到數量 (theoreticalAmountOut) 與最小可接受 (amountOutMin)
      const amountInBigInt = BigInt(amountIn.toString())  
      const theoreticalAmountOut = (amountInBigInt * rate!) / BigInt(1e18)
      const amountOutMin = (theoreticalAmountOut * BigInt(Math.floor(slippageFactor * 10000))) / BigInt(10000)

      // swapExactTokensForTokens 執行交換
      const txHash = await writeContractAsync({
        abi: RouterABI,
        address: ROUTER_ADDRESS as `0x${string}`,
        functionName: 'swapExactTokensForTokens',
        args: [amountIn, amountOutMin, path, address!]
      })

      setTxHash(txHash)
    } catch (e) {
      console.error(e)
      setError(SwapError.TxFailed)
      setStatus('error')
    }
  }, [amountFrom, address, fromTokenInfo.address, path, rate, slippage, writeContractAsync])

  // ====== 點擊 Swap 主按鈕邏輯，先檢查連線，觸發 approve + swap ======
  const onSwapClicked = useCallback(() => {
    if (!isConnected) {
      connect({ connector: injected() })
      return
    }
    if (!amountFrom || Number(amountFrom) <= 0) {
      setError(SwapError.InvalidAmount)
      return
    }
    setError(SwapError.None)
    handleApproveAndSwap()
  }, [amountFrom, connect, handleApproveAndSwap, isConnected])

  // ========== UI 區塊：所有元件、狀態、錯誤都自動顯示 ==========
  return (
  <div className="max-w-md w-full bg-[#f6f7fa]/90 dark:bg-[#181f2b] border border-[#eaeef4] dark:border-[#263046] rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.12)] hover:shadow-[0_14px_56px_0_rgba(31,38,135,0.18)] transition-shadow text-slate-900 dark:text-white space-y-4">
    {/* 標題 */}
    <h2 className="text-2xl font-bold text-center mb-4 text-[#353772] dark:text-white">{t('swap.title')}</h2>

    {/* From Token & Amount 選擇 */}
    <div className="flex flex-col gap-3">
      <label className="block text-sm mb-1 font-semibold text-[#6366f1]">{t('swap.from')}</label>
      <TokenSelector tokens={tokens} selected={tokenFrom} onChange={handleSetTokenFrom} disabledSymbol={tokenTo} />
      <input
        type="text"
        inputMode="decimal"
        value={amountFrom}
        onChange={handleAmountFromChange}
        className="w-full px-5 py-3 rounded-2xl border border-[#e9ecef] dark:border-[#233049] bg-white/80 dark:bg-white/10 text-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition font-mono"
        placeholder={t('swap.inputAmount')}
      />
    </div>

    {/* Swap 方向切換 */}
    <div className="flex justify-center my-3">
      <Repeat
        className="w-10 h-10 text-[#6d6ddc] dark:text-[#79aaff] cursor-pointer hover:rotate-180 transition-transform duration-300 bg-white/80 dark:bg-white/10 rounded-full border border-[#eaeef4] dark:border-[#263046] shadow p-2"
        onClick={handleSwapDirection}
      />
    </div>

    {/* To Token & Amount */}
    <div className="flex flex-col gap-3">
      <label className="block text-sm mb-1 font-semibold text-[#6366f1]">{t('swap.to')}</label>
      <TokenSelector tokens={tokens} selected={tokenTo} onChange={handleSetTokenTo} disabledSymbol={tokenFrom} />
      <input
        type="text"
        value={amountTo}
        readOnly
        className="w-full px-5 py-3 rounded-2xl border border-[#e9ecef] dark:border-[#233049] bg-white/80 dark:bg-white/10 text-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition font-mono"
        placeholder="0.0"
      />
    </div>

    {/* 滑點容忍度調整 */}
    <div className="mt-4 mb-4">
      <label className="block mb-1 font-semibold text-[#6366f1]">{t('swap.SlippageTolerance')} (%)</label>
      <div className="flex gap-3 mb-2">
        {[1, 3, 5].map(pct => (
          <button
            key={pct}
            onClick={() => handleSetSlippage(pct)}
            className={`px-4 py-2 rounded-xl border font-semibold ${
              slippage === pct ? 'bg-[#6366f1] text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            } hover:bg-[#6366f1] hover:text-white transition`}
            type="button"
          >
            {pct}%
          </button>
        ))}
        <input
          type="text"
          inputMode="decimal"
          value={slippage === 0 ? '' : slippage}
          onChange={handleSlippageChange}
          placeholder="自訂滑點數字 (0.1 ~ 50)"
          className="w-24 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6366f1] transition"
        />
      </div>
    </div>

    {/* 匯率顯示 */}
    <div className="text-sm text-gray-400">
      {rate !== null
        ? t('swap.rate', {
            from: tokenFrom,
            rate: Number(formatEther(rate)).toFixed(6),
            to: tokenTo
          })
        : t('swap.rateLoading')}
    </div>

    {/* 餘額、錯誤、狀態 */}
    <div className="space-y-1">
      {/* Balance 顯示 */}
      {fromBalance !== undefined && (
        <div className="text-sm text-gray-400">
          {t('swap.balance', { amount: formatEther(fromBalance), symbol: tokenFrom })}
        </div>
      )}

      {/* 錯誤顯示 */}
      {error !== SwapError.None && (
        <div className="text-red-400 text-sm">{t(error)}</div>
      )}

      {/* 狀態顯示 */}
      {(status === 'approving' || status === 'swapping') && (
        <div className="text-blue-500 font-semibold">
          {status === 'approving' ? t('swap.approving') : t('swap.swapping')}
        </div>
      )}
      {status === 'success' && (
        <div className="text-green-600 font-semibold">{t('swap.success')}</div>
      )}
      {status === 'error' && (
        <div className="text-red-600 font-semibold">{t('swap.fail')}</div>
      )}
    </div>

    {/* 兌換主按鈕 */}
    <button
      onClick={onSwapClicked}
      disabled={
        !isConnected ||
        !amountFrom ||
        Number(amountFrom) <= 0 ||
        error !== SwapError.None ||
        status === 'approving' ||
        status === 'swapping' ||
        rate === null
      }
      className="w-full py-3 mt-8 rounded-2xl bg-gradient-to-r from-[#7f5fff] via-[#4f6be6] to-[#21cfff] text-white font-bold text-lg shadow-lg hover:scale-[1.03] hover:shadow-xl active:scale-100 transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-400"
    >
      {isConnected ? t('swap.swap') : t('swap.connect')}
    </button>

    {/* 已連線錢包簡短地址顯示 */}
    {isConnected && address && (
      <div className="text-xs text-gray-400 text-center mt-2">
        {t('swap.connected', { address: displayAddress })}
      </div>
    )}
  </div>
)

}
