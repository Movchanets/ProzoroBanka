import { useEffect, useState } from 'react';
import { LaptopMinimal, MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const themeOptions = [
  { value: 'light', label: 'Світла', icon: SunMedium },
  { value: 'dark', label: 'Темна', icon: MoonStar },
  { value: 'system', label: 'Системна', icon: LaptopMinimal },
] as const;

export function ThemeToggle() {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeOption = themeOptions.find((option) => option.value === (theme ?? 'system')) ?? themeOptions[2];
  const ActiveIcon = mounted
    ? resolvedTheme === 'dark'
      ? MoonStar
      : SunMedium
    : activeOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full border-border/80 bg-card/90 text-foreground shadow-lg shadow-black/5 backdrop-blur supports-backdrop-filter:bg-card/75"
          aria-label="Змінити тему"
        >
          <ActiveIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Оформлення</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="justify-between gap-3">
            <span>{label}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {theme === value ? 'Активна' : ''}
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}