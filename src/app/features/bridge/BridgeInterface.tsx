'use client'

// ======== import 各種前端、區塊鏈、React 相關函式庫 ========
import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next' // i18n 國際化
import { useAccount, useReadContract, useChainId, useBalance } from 'wagmi' // wagmi hooks
import TokenABI from '@/app/abi/ERC20.json' // ERC20 ABI
import { formatEther, parseEther } from 'viem' // ETH 數值格式處理
import { BigNumber } from 'ethers' // ethers.js BigNumber 處理
import { EthBridger } from '@arbitrum/sdk' // Arbitrum SDK：ETH 橋接工具
import { ethers } from 'ethers' // ethers.js provider

// ======== 定義常數與網路參數 ========
const L1_CHAIN_ID = 11155111        // Ethereum Sepolia 測試網
const L2_CHAIN_ID = 421614          // Arbitrum Sepolia 測試網

// L2 網路相關參數（只要你要橋接 Arbitrum，都會用到這包參數）
const L2_NETWORK = {
  chainId: 421614,
  name: "Arbitrum Sepolia",
  partnerChainId: 11155111,
  rpcURL: "https://sepolia-rollup.arbitrum.io/rpc",
  explorerUrl: "https://sepolia.arbiscan.io",
  blockTime: 2,
  parentChainId: 11155111,
  ethBridge: {
    inbox: "0xaAe29B0366299461418F5324a79Afc425BE5ae21",
    outbox: "0x65f07C7D521164a4d5DaC6eB8Fac8DA067A3B78F",
    rollup: "0x042B2E6C5E99d4c521bd49beeD5E99651D9B0Cf4",
    bridge: "0x38f918D0E9F1b721EDaA41302E399fa1B79333a9",
    sequencerInbox: "0x6c97864CE4bEf387dE0b3310A44230f7E3F1be0D"
  },
  confirmPeriodBlocks: 20,
  isTestnet: true,
  isCustom: false
}

// 支援的 L1/L2 網路選項（前端顯示用）
const NETWORKS = [
  { label: 'Ethereum Sepolia', value: 'sepolia', chainId: 11155111 },
  { label: 'Arbitrum Sepolia', value: 'arbitrum', chainId: 421614 }
]

// 支援的 Token（只放 ETH，後續可擴充其他 ERC20）
const TOKENS = [
  { label: 'SepoliaETH', symbol: 'ETH', address: '', isNative: true }, // 原生 ETH
]

// 狀態型別，idle=閒置、bridging=執行中、success=成功、error=錯誤
type BridgeStatus = 'idle' | 'bridging' | 'success' | 'error'

// =================== 主要元件 ===================
export default function BridgeInterface() {
  // i18n
  const { t } = useTranslation()
  // 取得使用者錢包狀態
  const { address, isConnected } = useAccount()
  // 當前網路
  const chainId = useChainId()

  // ===== 狀態管理 =====
  const [token, setToken] = useState(TOKENS[0].symbol) // 預設 ETH
  const [amount, setAmount] = useState('') // 輸入金額
  const [status, setStatus] = useState<BridgeStatus>('idle') // 執行狀態
  const [error, setError] = useState<string | null>(null) // 錯誤訊息

  // ====== 計算目前的 from / to 網路（根據 chainId 判斷）======
  const fromNetwork = useMemo(
    () => NETWORKS.find(n => n.chainId === chainId) || NETWORKS[0],
    [chainId]
  )
  const toNetwork = useMemo(
    () => NETWORKS.find(n => n.chainId !== fromNetwork.chainId) || NETWORKS[1],
    [fromNetwork]
  )

  // 取得目前選擇的 Token 資訊
  const tokenInfo = useMemo(() => TOKENS.find(t => t.symbol === token)!, [token])

  // ====== 查詢錢包餘額 ======
  // 如果是 ETH 就直接查用戶餘額，否則用 ERC20 合約查詢
  const { data: nativeBalanceData } = useBalance({
    address: address,
    chainId: chainId,
  })
  const { data: erc20BalanceData } = useReadContract({
    address: tokenInfo.address as `0x${string}`,
    abi: TokenABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: isConnected && !!address && !tokenInfo.isNative }
  })

  // 處理餘額顯示：如果是 ETH 則用 nativeBalance，否則用 ERC20
  const balance: bigint =
    tokenInfo.isNative
      ? (nativeBalanceData?.value ?? BigInt(0))
      : (typeof erc20BalanceData === 'bigint' ? erc20BalanceData : BigInt(0))

  // 顯示用的餘額（字串，顯示小數點）
  const balanceDisplay = useMemo(() => formatEther(balance), [balance])

  // 檢查用戶輸入金額是否超過餘額
  const insufficientBalance = useMemo(() => {
    if (!amount || !balance) return false
    try {
      return parseEther(amount) > balance
    } catch { return false }
  }, [amount, balance])

  // 處理輸入金額，只允許數字與小數點
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim()
    setAmount(val)
    if (!val) setError(null)
    else if (!/^\d*\.?\d*$/.test(val) || Number(val) <= 0)
      setError(t('bridge.error.invalidAmount'))
    else setError(null)
  }

  // =================== 橋接/提領 主邏輯 ===================
  const handleBridge = async () => {
    setError(null)
    // 前置檢查
    if (!amount || Number(amount) <= 0) {
      setError(t('bridge.error.invalidAmount'))
      return
    }
    if (!window.ethereum) {
      setError('請安裝 MetaMask')
      return
    }
    setStatus('bridging')

    try {
      // 建立 provider 與 signer
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const currentChainId = (await provider.getNetwork()).chainId

      // === L1 → L2 存款（Deposit） ===
      if (currentChainId === L1_CHAIN_ID) {
        const ethBridger = new EthBridger(L2_NETWORK)
        const parsedAmt = BigNumber.from(parseEther(amount).toString())

        // 呼叫 Arbitrum SDK 存款
        const depositTx = await ethBridger.deposit({
          amount: parsedAmt,
          parentSigner: signer,
        })

        await depositTx.wait()
        setStatus('success')
        setAmount('')
      }
      // === L2 → L1 提領（Withdraw） ===
      else if (currentChainId === L2_CHAIN_ID) {
        const ethBridger = new EthBridger(L2_NETWORK)
        const parsedAmt = BigNumber.from(parseEther(amount).toString())
        const withdrawTx = await ethBridger.withdraw({
          amount: parsedAmt,
          childSigner: signer,
          destinationAddress: await signer.getAddress(),
          from: await signer.getAddress(),
        })
        await withdrawTx.wait()
        setStatus('success')
        setAmount('')
      }
      // === 其他網路（不支援） ===
      else {
        setStatus('idle')
        setError('請切換到 Ethereum Sepolia 或 Arbitrum Sepolia 網路')
      }
    } catch (err: any) {
      setStatus('error')
      setError(err.message || '橋接失敗')
    }
  }

  // ====== 狀態變化時的 UI reset 處理 ======
  useEffect(() => {
    if (error) setStatus('error')
    else if (status === 'error') setStatus('idle')
  }, [error])
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setStatus('idle'), 2200)
      return () => clearTimeout(timer)
    }
  }, [status])

  // 顯示簡短地址
  const displayAddress = useMemo(() =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '', [address]
  )

  // =================== 前端 UI ===================
  return (
    <div className="max-w-md w-full bg-[#f6f7fa]/90 dark:bg-[#181f2b] border border-[#eaeef4] dark:border-[#263046] rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.12)] hover:shadow-[0_14px_56px_0_rgba(31,38,135,0.18)] transition-shadow text-slate-900 dark:text-white space-y-4">
      {/* 標題：根據網路切換 L1→L2 or L2→L1 */}
      <h2 className="text-2xl font-bold text-center mb-4 text-[#353772] dark:text-white">
        {chainId === L1_CHAIN_ID
          ? t('bridge.titleL1toL2', 'L1 → L2 Bridge')
          : chainId === L2_CHAIN_ID
            ? t('bridge.titleL2toL1', 'L2 → L1 Withdraw')
            : t('bridge.titleUnsupported', 'Unsupported Network')}
      </h2>
      {/* 網路選單區：From/To */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-sm mb-1 font-semibold text-[#6366f1]">{t('bridge.fromNetwork')}</label>
          <div className="w-full px-5 py-3 rounded-2xl border bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white text-lg font-mono">
            {fromNetwork.label}
          </div>
        </div>
        <div className="mx-2 my-auto text-2xl">⇄</div>
        <div className="flex-1">
          <label className="block text-sm mb-1 font-semibold text-[#6366f1]">{t('bridge.toNetwork')}</label>
          <div className="w-full px-5 py-3 rounded-2xl border bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white text-lg font-mono">
            {toNetwork.label}
          </div>
        </div>
      </div>

      {/* Token & 金額輸入 */}
      <div className="flex flex-col gap-3">
        <label className="block text-sm mb-1 font-semibold text-[#6366f1]">{t('bridge.token', 'Token')}</label>
        <select
          className="w-full px-5 py-3 rounded-2xl border bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={token}
          onChange={e => setToken(e.target.value)}
        >
          {/* Token 下拉選單 */}
          {TOKENS.map(tk => (
            <option key={tk.symbol} value={tk.symbol}>
              {tk.label} ({tk.symbol})
            </option>
          ))}
        </select>
        {/* 金額輸入框 */}
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={handleAmountChange}
          className="w-full px-5 py-3 rounded-2xl border border-[#e9ecef] dark:border-[#233049] bg-white/80 dark:bg-white/10 text-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition font-mono"
          placeholder={t('bridge.inputAmount', 'Amount')}
        />
      </div>

      {/* 顯示餘額／錯誤／狀態 */}
      <div className="space-y-1 min-h-[1.5em]">
        {/* 顯示餘額 */}
        {isConnected && (
          <div className="text-sm" style={{ color: insufficientBalance ? "#e06464" : "#8a91b4" }}>
            {t('bridge.balance', { amount: balanceDisplay, symbol: tokenInfo.label })}
          </div>
        )}
        {/* 餘額不足錯誤 */}
        {insufficientBalance && (
          <div className="text-red-400 text-sm">{t('bridge.error.insufficientBalance')}</div>
        )}
        {/* 一般錯誤訊息 */}
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {/* 執行中提示 */}
        {status === 'bridging' && (
          <div className="text-blue-500 font-semibold">{t('bridge.bridging')}</div>
        )}
        {/* 成功提示 */}
        {status === 'success' && (
          <div className="text-green-600 font-semibold">{t('bridge.success')}</div>
        )}
        {/* 失敗提示 */}
        {status === 'error' && (
          <div className="text-red-600 font-semibold">{t('bridge.fail')}</div>
        )}
      </div>

      {/* 橋接/提領按鈕 */}
      <button
        onClick={handleBridge}
        disabled={
          !isConnected ||
          !amount ||
          Number(amount) <= 0 ||
          status === 'bridging' ||
          !!error ||
          insufficientBalance
        }
        className="w-full py-3 mt-8 rounded-2xl bg-gradient-to-r from-[#7f5fff] via-[#4f6be6] to-[#21cfff] text-white font-bold text-lg shadow-lg hover:scale-[1.03] hover:shadow-xl active:scale-100 transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-400"
      >
        {isConnected
          ? (chainId === L1_CHAIN_ID
            ? t('bridge.bridge', 'Bridge')
            : chainId === L2_CHAIN_ID
              ? t('bridge.withdraw', 'Withdraw')
              : t('bridge.unsupported', 'Unsupported Network')
          )
          : t('bridge.connect', 'Connect Wallet')}
      </button>

      {/* 錢包連線後，顯示簡短地址 */}
      {isConnected && address && (
        <div className="text-xs text-gray-400 text-center mt-2">
          {t('bridge.connected', { address: displayAddress })}
        </div>
      )}
    </div>
  )
}
