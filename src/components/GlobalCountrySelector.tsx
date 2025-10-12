import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import countriesData from '@/data/countries-enhanced.json';

interface Country {
  code: string;
  name: string;
  flag: string;
}

const countries: Country[] = countriesData;

export const GlobalCountrySelector = () => {
  const { profile, updateProfile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry = useMemo(() => {
    return countries.find(c => c.code === profile?.preferredCountry) || countries.find(c => c.code === 'IT');
  }, [profile?.preferredCountry]);

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    const searchLower = search.toLowerCase();
    return countries.filter(
      c => c.name.toLowerCase().includes(searchLower) || c.code.toLowerCase().includes(searchLower)
    );
  }, [search]);

  const handleSelect = async (countryCode: string) => {
    const result = await updateProfile({ preferredCountry: countryCode });
    if (result.success) {
      toast.success('Paese aggiornato');
      setOpen(false);
      setSearch('');
    } else {
      toast.error('Errore aggiornamento paese');
    }
  };

  if (!selectedCountry) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-accent"
        >
          <span className="text-2xl">{selectedCountry.flag}</span>
          <span className="hidden md:inline">{selectedCountry.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <Input
            placeholder="Cerca paese..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            {filteredCountries.map((country) => (
              <Button
                key={country.code}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-2 px-3"
                onClick={() => handleSelect(country.code)}
              >
                <span className="text-2xl flex-shrink-0">{country.flag}</span>
                <span className="flex-1 text-left">{country.name}</span>
                {country.code === profile?.preferredCountry && (
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
