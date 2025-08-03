"use client";
import React from "react";
import LanguageDropdown from './LanguageDropdown';
import ConnectWallet from './ConnectWallet';
import ThemeToggle from './ThemeToggle';
import ChainSwitcher from './ChainSwitcher';
import { useAppState } from "@/app/context/AppStateProvider";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { t } = useTranslation();
  const NAV_TABS = [
    { label: t("swapC"), key: "swap" },
    {label: t("bridgeTitle"), key: "bridge"},
    { label: t("assets"), key: "asset" },
    { label: t("transactions"), key: "history" }
  ];
  const { currentTab, setCurrentTab } = useAppState();

  return (
    <header className="bg-[#f7f8fa] dark:bg-[#101824] border-b border-[#eaeaea] dark:border-[#1b2331] sticky top-0 z-20">
      <div className="w-full max-w-screen-lg mx-auto flex flex-wrap items-center justify-between px-2 md:px-3 py-2 gap-2">
        {/* 左側：Logo + 導覽 */}
        <div className="flex items-center gap-2">
          <img
            src="/elephant.png"
            alt="elephant logo"
            className="h-8 w-8 rounded-xl shadow"
          />
          <span className="font-bold text-lg text-[#26407c] dark:text-white ml-1 hidden sm:block">SwapDApp</span>
          <nav className="flex text-sm ml-2">
            {NAV_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setCurrentTab(tab.key)}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  currentTab === tab.key
                    ? "text-[#26407c] dark:text-white"
                    : "text-slate-500 hover:text-[#26407c] dark:text-slate-400 dark:hover:text-white"
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右側：操作 + 切換鏈 */}
        <div className="flex items-center gap-2">
          <ChainSwitcher />
          <LanguageDropdown />
          <ThemeToggle />
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
};

export default Header;
