import { ReactNode } from "react";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";

type RequireWalletConnectedProps = {
  children: ReactNode;
  messageTitle?: string;
  messageContent?: string;
};

export default function RequireWalletConnected({
  children,
  messageTitle,
  messageContent
}: RequireWalletConnectedProps) {
  const { isConnected } = useAccount();
  const { t } = useTranslation();

  const title = messageTitle || t("not_connected");
  const content = messageContent || t("connect_to_view_assets");

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 transition-colors">
        <div className="bg-white dark:bg-[#222b36] rounded-xl px-8 py-6 text-center shadow-lg transition-colors">
          <div className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">{title}</div>
          <div className="text-gray-500 dark:text-gray-400 text-base">{content}</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
