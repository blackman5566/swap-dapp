'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// 📦 localStorage 中的 key 名稱
const TAB_KEY = "dapp_current_tab";

// ✅ 定義 Context 的型別
type AppStateContextType = {
  signedIn: boolean;
  setSignedIn: (b: boolean) => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  currentTab: string;
  setCurrentTab: (l: string) => void;
};

// 建立 Context，預設為 undefined
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// ✅ 包住整個應用的 Provider
export function AppStateProvider({ children }: { children: ReactNode }) {
  // 1️⃣ 狀態定義
  const [signedIn, setSignedIn] = useState(false);       // 登入狀態
  const [loading, setLoading] = useState(false);         // 載入中狀態
  const [currentTab, setCurrentTabRaw] = useState("swap"); // 當前 Tab，預設是 swap

  // 2️⃣ 首次載入時從 localStorage 取回 currentTab
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTab = localStorage.getItem(TAB_KEY);
      if (storedTab) setCurrentTabRaw(storedTab);
    }
  }, []);

  // 3️⃣ 切換 Tab 時，同步更新 state 與 localStorage
  const setCurrentTab = (tab: string) => {
    setCurrentTabRaw(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem(TAB_KEY, tab);
    }
  };

  // 4️⃣ 將全域狀態透過 Context 提供出去
  return (
    <AppStateContext.Provider
      value={{
        signedIn,
        setSignedIn,
        loading,
        setLoading,
        currentTab,
        setCurrentTab,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// ✅ 取用 AppState 的 custom hook
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
