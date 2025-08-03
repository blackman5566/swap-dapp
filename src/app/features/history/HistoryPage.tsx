"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";                        // 取得錢包連線狀態
import { useTranslation } from "react-i18next";             // 多語系
import RequireWalletConnected from "@/app/components/RequireWalletConnected"; // 自訂：需連錢包的頁面包裹

const PAGE_SIZE = 5; // 每頁顯示幾筆

// 交易資料格式型別（Etherscan 格式 + 自訂欄位）
type Tx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimal?: string;
  timeStamp: string;
  gasUsed?: string;
  gasPrice?: string;
  txreceipt_status?: string;
  isError?: string;
  logIndex?: string | number;
};

export default function HistoryPage() {
  // ========== 鉤子與狀態 ==========
  const { address, isConnected } = useAccount();           // 錢包連線與地址
  const { t, i18n } = useTranslation();                    // 多語系切換

  const [txs, setTxs] = useState<Tx[]>([]);                // 當前交易列表
  const [loading, setLoading] = useState(false);           // 是否載入中
  const [page, setPage] = useState(1);                     // 當前頁數
  const [hasMore, setHasMore] = useState(true);            // 是否還有下一頁
  const [copiedHash, setCopiedHash] = useState<string | null>(null); // 已複製 hash

  // ========== 錢包變動就重載第一頁交易紀錄 ==========
  useEffect(() => {
    if (!isConnected || !address) return;
    setTxs([]);
    setPage(1);
    setHasMore(true);
    fetchTxs(1, true); // 初始化拉第一頁
    // eslint-disable-next-line
  }, [isConnected, address]);

  // ========== 拉取交易資料（分頁，每次拉 PAGE_SIZE 筆） ==========
  const fetchTxs = async (curPage: number, reset = false) => {
    setLoading(true);
    try {
      // 呼叫後端 API，格式 ?address=xxx&page=1&offset=5
      const res = await fetch(`/api/history?address=${address}&page=${curPage}&offset=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("API Error");

      const text = await res.text();
      if (!text) throw new Error("Empty");

      const data = JSON.parse(text);

      // 只取有 tokenSymbol 的資料（ERC20, 排除 ETH）
      const filtered: Tx[] = (Array.isArray(data.result) ? data.result : []).filter(
        (tx: Tx) => !!tx.tokenSymbol
      );

      if (reset) setTxs(filtered);             // 重載就直接設資料
      else setTxs((prev) => [...prev, ...filtered]); // 否則加在後面

      setHasMore(filtered.length === PAGE_SIZE); // 如果不足 PAGE_SIZE 就沒下一頁
    } catch {
      setTxs([]);
      setHasMore(false);
    }
    setLoading(false);
  };

  // ========== 分頁加載更多 ==========
  const handleLoadMore = () => {
    fetchTxs(page + 1);
    setPage(page + 1);
  };

  // ========== 地址簡短顯示，過短則顯示 N/A ==========
  const renderAddress = (addr?: string | null) => {
    if (!addr || addr.length < 10) return <span className="text-gray-300">N/A</span>;
    return (
      <span title={addr} className="inline-block bg-blue-50 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs">
        {addr.slice(0, 6)}...{addr.slice(-4)}
      </span>
    );
  };

  // ========== 時間戳格式化 ==========
  const formatTime = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString(i18n.language === "zh-TW" ? "zh-TW" : "en-US");
  };

  // ========== 計算 Gas 費用並顯示（單位 ETH） ==========
  const renderGas = (tx: Tx) => {
    if (!tx.gasUsed || !tx.gasPrice) return null;
    const used = BigInt(tx.gasUsed);
    const price = BigInt(tx.gasPrice);
    const feeEth = (Number(used) * Number(price) / 1e18).toFixed(6);
    return (
      <span className="text-xs text-gray-400 ml-2">
        Gas: {feeEth} ETH
      </span>
    );
  };

  // ========== 狀態標示（已確認/失敗/處理中） ==========
  const getStatus = (tx: Tx) => {
    if (tx.txreceipt_status === "0" || tx.isError === "1")
      return { icon: "❌", color: "text-red-400", label: t("failed") || "失敗" };
    if (tx.txreceipt_status === "1" && tx.isError === "0")
      return { icon: "✅", color: "text-green-400", label: t("confirmed") || "已確認" };
    return { icon: "⏳", color: "text-yellow-400", label: t("pending") || "處理中" };
  };

  // ========== 發送 icon ==========
  function SentIcon() {
    return (
      <span className="inline-block w-8 h-8 flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="11" stroke="#f43f5e" strokeWidth="1.3" fill="none" />
          <path d="M8 18L18 8" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 8h-5" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 8v5" stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  // ========== 接收 icon ==========
  function ReceiveIcon() {
    return (
      <span className="inline-block w-8 h-8 flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="11" stroke="#22c55e" strokeWidth="1.3" fill="none" />
          <path d="M13 7v9" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M10 16l3 3 3-3" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  // ========== 渲染一筆交易 row，含送出/接收、hash複製、狀態顯示 ==========
  const renderTxRow = (tx: Tx, idx: number) => {
    const isSend = tx.from?.toLowerCase() === address?.toLowerCase(); // 自己發出 or 收到
    const symbol = tx.tokenSymbol!;
    const value = (+tx.value / Math.pow(10, Number(tx.tokenDecimal || 18))).toFixed(4);

    return (
      <a
        key={`${tx.hash}-${tx.logIndex ?? idx}`}
        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-5 bg-[#222838]/90 dark:bg-slate-800 rounded-2xl shadow-sm border border-[#2c3544] dark:border-slate-700 transition hover:shadow-2xl hover:scale-[1.015] duration-150 cursor-pointer no-underline"
        style={{ textDecoration: "none", minHeight: 90 }}
      >
        {/* 發送/接收 icon */}
        <div className="flex flex-col items-center gap-2 min-w-[40px]">
          {isSend ? <SentIcon /> : <ReceiveIcon />}
        </div>

        {/* 主內容：狀態/金額/對方地址/hash/gas */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-semibold text-[17px] ${isSend ? "text-red-500" : "text-green-500"}`}>
              {isSend ? t("sent") || "Sent" : t("received") || "Received"}
            </span>
            <span className="font-bold text-[16px] ml-2 text-white">
              {isSend ? "-" : "+"}{value} {symbol}
            </span>
          </div>
          {/* token 名稱 */}
          {tx.tokenName && <div className="text-xs text-gray-400 mb-0.5">{tx.tokenName}</div>}
          {/* 地址顯示 */}
          <div className="text-xs text-gray-400 mt-1">
            {isSend ? t("to") || "To" : t("from") || "From"}: {renderAddress(isSend ? tx.to : tx.from)}
          </div>
          {/* hash + gas 顯示 */}
          <div className="flex gap-2 mt-1 text-xs">
            <span
              title={tx.hash}
              className="text-blue-500/80 px-1.5 rounded cursor-pointer hover:underline"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await navigator.clipboard.writeText(tx.hash);
                setCopiedHash(tx.hash);
                setTimeout(() => setCopiedHash(null), 1200);
              }}
            >
              {tx.hash.slice(0, 20)}...
              {copiedHash === tx.hash && (
                <span className="text-green-500 ml-1">{t("copied_success") || "Copied!"}</span>
              )}
            </span>
            {renderGas(tx)}
          </div>
        </div>

        {/* 右側：時間 */}
        <div className="ml-3 text-xs text-gray-500 text-right whitespace-nowrap min-w-[104px]">
          {formatTime(tx.timeStamp)}
        </div>
      </a>
    );
  };

  // ========== 主要 UI ==========
  return (
    <RequireWalletConnected
      messageTitle={t("not_connected")}
      messageContent={t("connect_to_view_transactions")}
    >
      <div className="w-full max-w-screen-md mx-auto px-4 py-8 text-slate-900 dark:text-white">
        {/* 載入中 */}
        {loading && <div className="text-gray-400">{t("loading")}</div>}
        {/* 無資料 */}
        {!loading && txs.length === 0 && <div className="text-gray-400">{t("no_transactions")}</div>}
        {/* 交易清單 */}
        <div className="space-y-6">{txs.map(renderTxRow)}</div>
        {/* 分頁「載入更多」 */}
        {hasMore && (
          <button
            onClick={handleLoadMore}
            className={`
              w-full py-3 mt-8 rounded-2xl font-semibold text-base transition-all duration-150
              shadow bg-[#23293a] text-gray-100 border border-[#2c3544]
              hover:bg-[#263249] hover:shadow-xl
              dark:bg-[#23293a] dark:text-white dark:border-slate-700
              dark:hover:bg-[#30364a] dark:hover:text-white
              disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed
            `}
            disabled={loading}
          >
            {t("load_more") || "Load more"}
          </button>
        )}
      </div>
    </RequireWalletConnected>
  );
}
