"use client";
import React from "react";
import { useAppState } from "@/app/context/AppStateProvider";
import AssetPage from "./features/assets/AssetPage";
import HistoryPage from "@/app/features/history/HistoryPage";
import SwapPage from "@/app/features/swap/SwapPage";
import BridgeInterface from "@/app/features/bridge/BridgeInterface";
export default function Home() {
  const { currentTab } = useAppState();

  const renderContent = () => {
    switch (currentTab) {
      case "asset":
        return <AssetPage />;
      case "history":
        return <HistoryPage />;
      case "swap":
        return <SwapPage />;
        case "bridge":
        return <BridgeInterface />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#121212] p-8 pb-20 transition-colors">
    <main className="flex justify-center items-center min-h-[calc(100vh-56px)] px-2">
      {renderContent()}
    </main>
  </div>
  );
}
