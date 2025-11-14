import { useTheme, type Theme } from "../lib/theme-context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as Theme);
  };

  return (
    <label className="relative inline-block cursor-pointer text-muted hover:text-fg">
      <select
        value={theme}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 text-fg bg-bg cursor-pointer w-full h-full"
        aria-label="Theme selection"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <span>Theme</span>
    </label>
  );
}
