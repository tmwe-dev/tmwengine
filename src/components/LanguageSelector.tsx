import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'header' | 'sidebar';
}

export const LanguageSelector = ({ variant = 'header' }: LanguageSelectorProps) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  if (variant === 'sidebar') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2 h-9">
            <Globe className="h-4 w-4" />
            <span>{currentLang?.flag} {currentLang?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className="cursor-pointer"
            >
              <span className="mr-2">{language.flag}</span>
              {language.name}
              {currentLanguage === language.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang?.flag} {currentLang?.name}</span>
          <span className="sm:hidden">{currentLang?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className="cursor-pointer"
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
            {currentLanguage === language.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
