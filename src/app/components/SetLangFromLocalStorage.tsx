'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function SetLangFromLocalStorage() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") || "en";

    if (i18n.language !== storedLang) {
      i18n.changeLanguage(storedLang);
    }

    // 修正 <html lang="">
    document.documentElement.lang = storedLang;
  }, []);

  return null;
}
