import { useTranslation } from "react-i18next";
import { useState } from "react";

// 定義接收的 props 種型
// tokens 為所有要顯示的貨幣資料
// showBalance 控制是否顯示貨幣金額
// loading 為加載狀態

type AssetTokensProps = {
  showBalance: boolean;
  loading: boolean;
  tokens: {
    contract_address: string;
    contract_name: string;
    contract_ticker_symbol: string;
    logo_url: string;
    balance: string;
    quote: number | null;
  }[];
};

export default function AssetTokens({ showBalance, loading, tokens }: AssetTokensProps) {
  const { t } = useTranslation(); // 多國語 i18n 函數
  const [brokenIcons, setBrokenIcons] = useState<Record<string, boolean>>({}); // 記錄圖示失效的 token

  // 當圖示無法載入時加入 broken list
  const handleImgError = (address: string) => {
    setBrokenIcons(prev => ({ ...prev, [address]: true }));
  };

  return (
    <div className="
      max-w-2xl mx-auto
      bg-[#f6f7fa] dark:bg-[#232f44]/90
      border border-[#e9ecef] dark:border-[#233049]
      rounded-2xl shadow-lg dark:shadow-lg
      transition-colors
      divide-y divide-[#e5e7eb] dark:divide-[#233049]
      ">
      {loading ? (
        // 顯示 loading 時的狀態
        <div className="p-8 text-center text-gray-400 dark:text-gray-300">{t("loading")}</div>
      ) : tokens.length === 0 ? (
        // 如果沒有 token 資料
        <div className="p-8 text-center text-gray-400 dark:text-gray-300">{t("no_assets")}</div>
      ) : (
        // 顯示所有 token 列表
        tokens.map((token, i) => {
          const broken = brokenIcons[token.contract_address] || !token.logo_url;
          return (
            <div
              key={token.contract_address}
              className={[
                "flex items-center gap-6 py-5 px-6 group transition-colors duration-150",
                i === 0 && "rounded-t-2xl",
                i === tokens.length - 1 && "rounded-b-2xl",
                "hover:bg-[#e8ecf4] dark:hover:bg-[#26334d] hover:shadow-md",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* 圖示 or 英文首字 */}
              <div className="h-14 w-14 flex items-center justify-center rounded-full border border-[#e5e7eb] dark:border-[#223049] bg-white shadow-sm">
                {broken ? (
                  <span className="text-2xl text-gray-300 font-bold">
                    {token.contract_ticker_symbol?.charAt(0) ?? "?"}
                  </span>
                ) : (
                  <img
                    src={token.logo_url}
                    className="h-9 w-9 object-contain rounded-full bg-white"
                    alt={token.contract_name}
                    onError={() => handleImgError(token.contract_address)}
                  />
                )}
              </div>

              {/* 資產名稱與餘額 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900 dark:text-white">{token.contract_name}</span>
                  <span className="text-blue-600 dark:text-blue-300 text-sm">{token.contract_ticker_symbol}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                  {(Number(token.balance) / 10 ** 18).toLocaleString(undefined, { maximumFractionDigits: 6 })} {token.contract_ticker_symbol}
                </span>
              </div>

              {/* 顯示或隱藏 USD 價值 */}
              <div className="flex flex-col items-end min-w-[80px]">
                <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  {showBalance
                    ? token.quote != null
                      ? `$${token.quote.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      : "--"
                    : "****"}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
