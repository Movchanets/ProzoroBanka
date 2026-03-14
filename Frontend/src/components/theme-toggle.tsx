import { LaptopMinimal, MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
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
  { value: 'light', labelKey: 'theme.light', icon: SunMedium },
  { value: 'dark', labelKey: 'theme.dark', icon: MoonStar },
  { value: 'system', labelKey: 'theme.system', icon: LaptopMinimal },
] as const;

export function ThemeToggle() {
  const { t } = useTranslation();
  const { setTheme, resolvedTheme, theme } = useTheme();

  const activeOption = themeOptions.find((option) => option.value === (theme ?? 'system')) ?? themeOptions[2];
  const ActiveIcon = theme === 'system' ? (resolvedTheme === 'dark' ? MoonStar : SunMedium) : activeOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full border-border/80 bg-card/90 text-foreground shadow-lg shadow-black/5 backdrop-blur supports-backdrop-filter:bg-card/75"
          aria-label={t('theme.change')}
        >
          <ActiveIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map(({ value, labelKey, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="justify-between gap-3">
            <span>{t(labelKey)}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {theme === value ? t('theme.active') : ''}
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}