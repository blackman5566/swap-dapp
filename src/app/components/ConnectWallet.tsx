'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAppState } from "@/app/context/AppStateProvider";
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { useState } from 'react';
import { SiweMessage } from 'siwe';
import { useTranslation } from "react-i18next";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { signedIn, setSignedIn, loading, setLoading } = useAppState();
  const { t } = useTranslation();

  async function signInWithEthereum() {
    setLoading(true);
    try {
      if (!address) {
        alert(t('please_connect_wallet_first'));
        setLoading(false);
        return;
      }
      const nonceRes = await fetch('/api/siwe/nonce');
      const nonce = await nonceRes.text();
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      });
      const message = siweMessage.prepareMessage();
      const signature = await signMessageAsync({ message });
      const verifyRes = await fetch('/api/siwe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok || !result.ok) throw new Error('SIWE 驗證失敗');
      setSignedIn(true);
      alert(t('login_success'));
    } catch (err) {
      alert(t('login_failed') + ': ' + (err instanceof Error ? err.message : String(err)));
    }
    setLoading(false);
  }

  async function handleLogout() {
    await fetch('/api/siwe/logout', { method: 'POST' });
    disconnect();
    setSignedIn(false);
  }

  return (
    <ConnectButton.Custom>
      {({ account, openConnectModal, mounted }) => (
        <div className="flex items-center gap-2">
          {!mounted || !account ? (
            <button
              className="bg-[#1d3557] text-white rounded-lg px-3 py-2 hover:bg-[#457b9d] text-xs md:text-sm font-semibold transition-all"
              onClick={openConnectModal}
              type="button"
              disabled={loading}
            >
              <span className="hidden sm:inline">{t('connect_wallet')}</span>
              <span className="inline sm:hidden">{t('connect_wallet_short')}</span>
            </button>
          ) : (
            <>
              <span className="text-xs text-white hidden sm:inline max-w-[90px] truncate">{account.displayName}</span>
              <button
                className="ml-2 bg-gray-200 dark:bg-slate-700 text-[#003049] dark:text-slate-100 rounded-lg px-2 py-1 text-xs hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                onClick={handleLogout}
                type="button"
                disabled={loading}
              >
                <span className="hidden sm:inline">{t('disconnect_wallet')}</span>
                <span className="inline sm:hidden">{t('disconnect_wallet_short')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </ConnectButton.Custom>
  );
}
