import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/translation.json";
import zhTW from "@/locales/zh-TW/translation.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "zh-TW": { translation: zhTW },
    },
    lng: "en", // 預設語言
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
