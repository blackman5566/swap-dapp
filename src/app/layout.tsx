'use client';

import "@/i18n";
import dynamic from 'next/dynamic';
import '@rainbow-me/rainbowkit/styles.css';
import Header from '@/app/components/Header';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/app/context/AppStateProvider";
import SetLangFromLocalStorage from "@/app/components/SetLangFromLocalStorage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const Web3Provider = dynamic(() => import('@/app/context/Web3Provider'), { ssr: false });

// 包含了主題色、Web3Provider、global CSS。
// 比喻 iOS AppDelegate/SceneDelegate 的 rootViewController，或 Flutter 的 MaterialApp() 外層 scaffold。
// 這裡用iOS AppDelegate/SceneDelegate、Flutter MaterialApp的角度，來白話解釋 Next.js 的 layout.tsx 在 App 裡的意義和責任！
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
     <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <SetLangFromLocalStorage />
  <AppStateProvider>
    <Web3Provider>
      <Header />
      {children}
    </Web3Provider>
  </AppStateProvider>
      </body>
    </html>
  );
}
