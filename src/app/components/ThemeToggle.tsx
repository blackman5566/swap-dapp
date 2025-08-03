"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "切換成亮色模式" : "切換成深色模式"}
      type="button"
      className=""
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        outline: "none",
        boxShadow: "none",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {theme === "dark"
        ? <Sun className="w-4 h-4 text-yellow-500" />
        : <Moon className="w-4 h-4 text-slate-600" />
      }
    </button>
  );
}
