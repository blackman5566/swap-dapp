'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// ========== 資料型別：單筆 swap 記錄（可擴充） ==========
export type SwapRecord = {
  fromToken: string;    // 來源 Token Symbol
  toToken: string;      // 目標 Token Symbol
  fromAmount: string;   // 兌換出去的數量
  toAmount: string;     // 兌換收到的數量
  timestamp: number;    // 交易時間戳
}

// ========== 動態引入 SwapInterface，關閉 SSR，讓其只在 client 渲染 ==========
const SwapInterface = dynamic(() => import('@/app/features/swap/SwapInterface'), { ssr: false })

export default function SwapPage() {
  // swapHistory：本地歷史紀錄，最多 5 筆
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>([])

  // ========== 首次渲染時從 localStorage 載入 swap 歷史 ==========
  useEffect(() => {
    const stored = localStorage.getItem('swap_history')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setSwapHistory(parsed)
        }
      } catch (e) {
        console.error('Failed to parse swap_history from localStorage', e)
      }
    }
  }, [])

  // ========== 新增一筆 swap 歷史，並儲存到 localStorage ==========
  const addSwapRecord = (record: SwapRecord) => {
    const updated = [record, ...swapHistory].slice(0, 5) // 新紀錄放最前面，只保留最新 5 筆
    setSwapHistory(updated)
    localStorage.setItem('swap_history', JSON.stringify(updated))
  }

  // ========== UI 渲染區：傳入 addSwapRecord 給 SwapInterface ==========
  return (
    <div className="w-full max-w-screen-md mx-auto px-4 py-8 text-slate-900 dark:text-white flex justify-center items-center">
      {/* swap 主要功能元件，呼叫時可 push swap 歷史 */}
      <SwapInterface addSwapRecord={addSwapRecord} />
    </div>
  )
}
