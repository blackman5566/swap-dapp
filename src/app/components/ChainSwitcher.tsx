import React from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { useTranslation } from "react-i18next";

export default function ChainSwitcher() {
  const chainId = useChainId()
  const { chains, switchChain, status, error } = useSwitchChain()
  const { t } = useTranslation();
  return (
    <div className="relative inline-block text-sm">
      <select
        className="appearance-none bg-white dark:bg-[#182235] border border-gray-300 dark:border-gray-700 text-[#26407c] dark:text-white rounded-md px-3 py-1.5 shadow-sm focus:outline-none cursor-pointer"
        value={chainId}
        onChange={(e) => switchChain?.({ chainId: Number(e.target.value) })}
        disabled={status === 'pending'}
      >
        {chains.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {status === 'pending' && (
        <div className="absolute top-full mt-1 text-xs text-blue-500">
          {t('change_message')}
        </div>
      )}

      {error && (
        <div className="absolute top-full mt-1 text-xs text-red-500">
          {error.message}
        </div>
      )}
    </div>
  )
}
