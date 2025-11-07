/**
 * Row compatta per vista elenco suggerimenti AI
 * Con logo, bandiera, badge e dropdown gruppi alternativi
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Check, TrendingUp, Building2, Star, Users, Loader2 } from 'lucide-react';
import type { GroupingSuggestion, EmailSenderGroup } from '@/types/email-management';
import { cn } from '@/lib/utils';
import { useCompanyLogo } from '@/hooks/email/useCompanyLogo';
import { extractInitials } from '@/lib/smart-inbox-utils';
import { detectCountryFromEmail, getCountryFlag } from '@/lib/email-utils';
import { isWCAPartner } from '@/data/wca-partners';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GroupingSuggestionRowProps {
  suggestion: GroupingSuggestion;
  availableGroups: EmailSenderGroup[];
  onAccept: (suggestionId: string, groupId: string | null, groupName: string) => void;
  onSelectGroup: (suggestionId: string, groupId: string) => void;
  disabled?: boolean;
}

export const GroupingSuggestionRow = ({
  suggestion,
  availableGroups,
  onAccept,
  onSelectGroup,
  disabled = false,
}: GroupingSuggestionRowProps) => {
  // State per dropdown, processing e debouncing
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const lastClickTime = useRef<number>(0);
  
  // Hook per logo aziendale
  const { data: logoData } = useCompanyLogo(suggestion.sender_email);
  
  // Rilevamento paese da email
  const countryCode = detectCountryFromEmail(suggestion.sender_email);
  const countryFlag = getCountryFlag(countryCode);
  
  // Check WCA Partner
  const isWCA = isWCAPartner(suggestion.sender_email);
  
  // Query rubrica per badge Cliente/WCA/Partner
  const { data: rubricaContact } = useQuery({
    queryKey: ['rubrica-contact', suggestion.sender_email],
    queryFn: async () => {
      const { data } = await supabase
        .from('rubrica')
        .select('id, nome, azienda, origine, meta_client, meta_wca')
        .ilike('email', suggestion.sender_email)
        .maybeSingle();
      
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
  
  const initials = extractInitials(suggestion.sender_email);
  
  // Suggerimento primario (confidence più alta)
  const primarySuggestion = suggestion.suggested_groups[0];
  const confidencePercent = Math.round(primarySuggestion.confidence * 100);
  const confidenceColor =
    primarySuggestion.confidence >= 0.8
      ? 'text-success bg-success/10'
      : primarySuggestion.confidence >= 0.6
      ? 'text-warning bg-warning/10'
      : 'text-muted-foreground bg-muted';

  // Separa nuovi gruppi da esistenti per dropdown
  const newGroups = availableGroups.filter(g => 
    suggestion.suggested_groups.some(sg => sg.group_id === g.id && sg.group_id !== null)
  );
  const existingGroups = availableGroups.filter(g => 
    !newGroups.some(ng => ng.id === g.id)
  );

  // Handler per accettazione suggerimento primario con debouncing
  const handleAccept = async () => {
    const now = Date.now();
    
    // Previeni click multipli entro 1 secondo
    if (now - lastClickTime.current < 1000) {
      console.log('⏭️ Click troppo rapido, ignorato');
      return;
    }
    
    lastClickTime.current = now;
    setIsProcessing(true);
    
    try {
      await onAccept(suggestion.id, primarySuggestion.group_id, primarySuggestion.group_name);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handler per assegnazione manuale con debouncing
  const handleManualAssign = async () => {
    if (!selectedGroupId) return;
    
    const now = Date.now();
    
    // Previeni click multipli entro 1 secondo
    if (now - lastClickTime.current < 1000) {
      console.log('⏭️ Click troppo rapido, ignorato');
      return;
    }
    
    lastClickTime.current = now;
    setIsProcessing(true);
    
    try {
      await onSelectGroup(suggestion.id, selectedGroupId);
      setSelectedGroupId('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all">
      {/* Logo + Email + Badge */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Avatar className="h-9 w-9 border border-border flex-shrink-0">
          {logoData?.logo_url ? (
            <AvatarImage src={logoData.logo_url} alt={suggestion.sender_email} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h4 className="font-medium text-sm flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{suggestion.sender_email}</span>
            </h4>
            
            {countryFlag && (
              <span className="text-sm flex-shrink-0" title={countryCode || undefined}>
                {countryFlag}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {rubricaContact?.meta_client && (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20 h-5">
                <Building2 className="w-2.5 h-2.5 mr-0.5" />
                Cliente
              </Badge>
            )}
            
            {rubricaContact && rubricaContact.origine && !rubricaContact.meta_client && (
              <Badge variant="secondary" className="text-xs bg-info/10 text-info border-info/20 h-5">
                <Users className="w-2.5 h-2.5 mr-0.5" />
                {rubricaContact.origine}
              </Badge>
            )}
            
            {(rubricaContact?.meta_wca || isWCA) && (
              <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning/20 h-5">
                <Star className="w-2.5 h-2.5 mr-0.5" />
                WCA
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Suggerimento AI Primario */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-medium text-sm truncate">{primarySuggestion.group_name}</span>
            {primarySuggestion.group_id === null && (
              <Badge variant="outline" className="text-xs h-4 px-1">
                Nuovo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{primarySuggestion.reason}</p>
        </div>
        <Badge variant="secondary" className={cn('text-xs font-medium flex-shrink-0', confidenceColor)}>
          <TrendingUp className="w-3 h-3 mr-0.5" />
          {confidencePercent}%
        </Badge>
      </div>

      {/* Azioni */}
      <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={disabled || isProcessing}
              className="h-8 px-3"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1" />
              )}
              Accetta
            </Button>

        {/* Dropdown Gruppi Alternativi */}
        <div className="flex items-center gap-1.5">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={disabled}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Oppure scegli..." />
            </SelectTrigger>
            <SelectContent>
              {newGroups.length > 0 && (
                <>
                  {newGroups.map(group => (
                    <SelectItem key={group.id} value={group.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{group.icon || '📧'}</span>
                        <span>{group.nome_gruppo}</span>
                        <Badge variant="outline" className="text-xs h-4 px-1 ml-1">
                          Nuovo
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  {existingGroups.length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t">
                      Gruppi Esistenti
                    </div>
                  )}
                </>
              )}
              
              {existingGroups.map(group => (
                <SelectItem key={group.id} value={group.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>{group.icon || '📧'}</span>
                    <span>{group.nome_gruppo}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={handleManualAssign}
            disabled={disabled || !selectedGroupId || isProcessing}
            variant="secondary"
            className="h-8 px-3"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : null}
            Assegna
          </Button>
        </div>
      </div>
    </div>
  );
};
