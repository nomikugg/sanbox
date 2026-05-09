// components/theme/theme-toggle.jsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-muted"
      aria-label="Cambiar tema"
    >
      {theme === "dark" ? 
        <Sun className="h-4 w-4 text-yellow-500" /> : 
        <Moon className="h-4 w-4 text-slate-700" />
      }
    </button>
  );
}