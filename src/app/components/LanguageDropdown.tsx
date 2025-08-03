"use client";
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
];

export default function LanguageDropdown() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("lang") || i18n.language || "en"
      : "en"
  );
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 點外面關閉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // 切換語系
  const handleChangeLang = (code: string) => {
    setLang(code);
    i18n.changeLanguage(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", code);
    }
    setOpen(false);
  };

  // 保證 i18n 跟 lang 同步
  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  const currentLangLabel = LANGUAGES.find((l) => l.code === lang)?.label || "EN";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-1.5 text-[#5c6a86] dark:text-slate-300 hover:text-[#457b9d] dark:hover:text-white rounded-full transition-colors flex items-center gap-1"
        aria-label="Select Language"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Globe className="w-4 h-4" />
        {/* md 以上顯示語系文字，md 以下只顯示 icon */}
        <span className="hidden md:inline text-xs font-medium">{currentLangLabel}</span>
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 min-w-[148px] bg-white dark:bg-[#101824] shadow-xl rounded-xl py-2 z-30 border border-[#ececec] dark:border-[#22304a]">
          {LANGUAGES.map((langItem) => (
            <button
              key={langItem.code}
              className={`w-full text-left px-6 py-2 text-[#003049] dark:text-slate-100 hover:bg-[#e9ecef] dark:hover:bg-[#19243a] transition-colors rounded-lg ${
                lang === langItem.code ? "font-bold bg-[#f1faee] dark:bg-[#1c2537]" : ""
              }`}
              onClick={() => handleChangeLang(langItem.code)}
              type="button"
            >
              {langItem.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
