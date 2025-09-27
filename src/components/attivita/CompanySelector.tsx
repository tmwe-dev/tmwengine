import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  source: 'rubrica' | 'imported';
  email?: string;
  phone?: string;
}

interface CompanySelectorProps {
  value?: string;
  onSelect: (companyId: string, companyName: string) => void;
  placeholder?: string;
}

export function CompanySelector({ value, onSelect, placeholder = "Seleziona azienda..." }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (value && companies.length > 0) {
      const company = companies.find(c => c.id === value);
      setSelectedCompany(company || null);
    }
  }, [value, companies]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      // Load from rubrica table
      const { data: rubricaData, error: rubricaError } = await supabase
        .from('rubrica')
        .select('id, nome, azienda, email, telefono')
        .not('nome', 'is', null)
        .order('nome');

      if (rubricaError) throw rubricaError;

      // Load from imported_contacts table (only those not yet transferred)
      const { data: importedData, error: importedError } = await supabase
        .from('imported_contacts')
        .select('id, name, company_name, email, phone')
        .eq('is_imported_to_rubrica', false)
        .not('name', 'is', null)
        .order('name');

      if (importedError) throw importedError;

      // Combine and format data
      const allCompanies: Company[] = [
        ...(rubricaData || []).map(item => ({
          id: item.id,
          name: item.azienda || item.nome,
          source: 'rubrica' as const,
          email: item.email,
          phone: item.telefono
        })),
        ...(importedData || []).map(item => ({
          id: item.id,
          name: item.company_name || item.name,
          source: 'imported' as const,
          email: item.email,
          phone: item.phone
        }))
      ];

      // Remove duplicates by name and sort
      const uniqueCompanies = allCompanies
        .filter((company, index, self) => 
          index === self.findIndex(c => c.name.toLowerCase() === company.name.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (company: Company) => {
    setSelectedCompany(company);
    onSelect(company.id, company.name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCompany ? (
            <div className="flex items-center gap-2">
              <span>{selectedCompany.name}</span>
              <span className="text-xs text-muted-foreground">
                ({selectedCompany.source === 'rubrica' ? 'Rubrica' : 'Importato'})
              </span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Cerca azienda..." 
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Caricamento...' : 'Nessuna azienda trovata.'}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => handleSelect(company)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{company.name}</div>
                      {(company.email || company.phone) && (
                        <div className="text-xs text-muted-foreground">
                          {company.email} {company.phone && `• ${company.phone}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {company.source === 'rubrica' ? 'Rubrica' : 'Importato'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}