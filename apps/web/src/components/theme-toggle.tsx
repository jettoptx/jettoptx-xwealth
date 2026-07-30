import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div
        className="h-8 w-8 shrink-0 rounded-md border border-border bg-elevated sm:h-9 sm:w-9"
        aria-hidden
      />
    );
  }

  const isLight = theme === "light";

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      {isLight ? <Moon className="size-3.5 sm:size-4" /> : <Sun className="size-3.5 sm:size-4" />}
    </Button>
  );
}
