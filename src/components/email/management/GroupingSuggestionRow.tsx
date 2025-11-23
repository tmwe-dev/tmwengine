/**
 * Row compatta per vista elenco suggerimenti AI
 * Con logo, bandiera, badge e dropdown gruppi alternativi
 */

import { useState, useRef } from 'react';
import funEmailMascot from '@/assets/funnemail-mascot.png';
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
import { SenderEmailsDialog } from './SenderEmailsDialog';

interface GroupingSuggestionRowProps {
  suggestion: GroupingSuggestion;
  availableGroups: EmailSenderGroup[];
  onAccept: (suggestionId: string, groupId: string | null, groupName: string) => void;
  onSelectGroup: (suggestionId: string, groupId: string) => void;
  disabled?: boolean;
  emailCount?: number;
  onGroupClick?: (groupName: string) => void;
}

export const GroupingSuggestionRow = ({
  suggestion,
  availableGroups,
  onAccept,
  onSelectGroup,
  disabled = false,
  emailCount,
  onGroupClick,
}: GroupingSuggestionRowProps) => {
  // State per dropdown, processing, debouncing e dialog email
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmailsDialog, setShowEmailsDialog] = useState(false);
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

  // Determina se stiamo mostrando la mascotte o un logo aziendale
  const isMascot = !logoData?.logo_url || 
                   logoData.source === 'not_found' || 
                   logoData.source === 'favicon' ||
                   logoData.logo_url.includes('favicon') ||
                   logoData.logo_url.includes('google.com');

  // Separa nuovi gruppi da esistenti per dropdown
  const newGroups = availableGroups.filter(g => 
    suggestion.suggested_groups.some(sg => sg.group_id === g.id && sg.group_id !== null)
  );
  const existingGroups = availableGroups.filter(g => 
    !newGroups.some(ng => ng.id === g.id)
  );

  // 🔤 ORDINA ALFABETICAMENTE
  newGroups.sort((a, b) => a.nome_gruppo.localeCompare(b.nome_gruppo, 'it'));
  existingGroups.sort((a, b) => a.nome_gruppo.localeCompare(b.nome_gruppo, 'it'));

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
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-all">
      {/* COLONNA SINISTRA: Bandiera sopra + Logo e Numero sotto */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {/* Bandiera centrata sopra */}
        {countryFlag && (
          <div className="flex justify-center">
            <span className="text-4xl" title={countryCode || undefined}>
              {countryFlag}
            </span>
          </div>
        )}
        
        {/* Logo + Numero orizzontali sotto, centrati */}
        <div className="flex items-center gap-3">
          {/* Logo con sfondo bianco */}
          <div className={cn(
            "flex items-center justify-center flex-shrink-0",
            isMascot 
              ? "h-20 w-20" // Mascotte più grande senza sfondo
              : "h-16 w-16 bg-white rounded-lg p-2 border border-border/50" // Logo con sfondo
          )}>
            <img 
              src={isMascot ? funEmailMascot : logoData.logo_url} 
              alt={suggestion.sender_email}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = funEmailMascot;
              }}
            />
          </div>
          
          {/* Conteggio Email - solo numero */}
          {emailCount !== undefined && emailCount > 0 && (
            <div className="flex items-center justify-center px-4 py-2 bg-info/10 rounded-lg border border-info/20">
              <span className="text-2xl font-bold text-info">{emailCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* COLONNA CENTRALE: Informazioni su 2 righe */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* RIGA 1: Email + Badge contestuali */}
        <div>
          <h4 
            className="font-semibold text-base flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => setShowEmailsDialog(true)}
            title="Clicca per vedere le email"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="break-all">{suggestion.sender_email}</span>
          </h4>
          
          <div className="flex items-center gap-2 flex-wrap">
            {rubricaContact?.meta_client && (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                <Building2 className="w-3 h-3 mr-1" />
                Cliente
              </Badge>
            )}
            
            {rubricaContact && rubricaContact.origine && !rubricaContact.meta_client && (
              <Badge variant="secondary" className="text-xs bg-info/10 text-info border-info/20">
                <Users className="w-3 h-3 mr-1" />
                {rubricaContact.origine}
              </Badge>
            )}
            
            {(rubricaContact?.meta_wca || isWCA) && (
              <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning/20">
                <Star className="w-3 h-3 mr-1" />
                WCA
              </Badge>
            )}
          </div>
        </div>

        {/* RIGA 2: Suggerimento AI + Descrizione completa + Pulsante Accetta */}
        <div className="space-y-2 bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg border border-primary/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span 
                className="font-semibold text-base cursor-pointer hover:text-primary transition-colors hover:underline"
                onClick={() => onGroupClick?.(primarySuggestion.group_name)}
                title="Clicca per filtrare per questo gruppo"
              >
                {primarySuggestion.group_name}
              </span>
              {primarySuggestion.group_id === null && (
                <Badge variant="outline" className="text-xs">
                  Nuovo
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn('text-sm font-semibold px-2.5 py-1', confidenceColor)}>
                <TrendingUp className="w-4 h-4 mr-1.5" />
                {confidencePercent}%
              </Badge>
              
              {/* Pulsante Accetta spostato qui */}
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={disabled || isProcessing}
                className="h-8 px-3 whitespace-nowrap"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                Accetta
              </Button>
            </div>
          </div>
          
          {/* Descrizione AI COMPLETA (no truncate) */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {primarySuggestion.reason}
          </p>
        </div>
      </div>

      {/* COLONNA DESTRA: Selezione Alternativa */}
      <div className="flex flex-col gap-2 flex-shrink-0 self-center">
        <p className="text-xs text-muted-foreground font-medium">
          Oppure scegli un altro gruppo:
        </p>
        
        {/* Dropdown Gruppi Alternativi */}
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={disabled}>
          <SelectTrigger className="h-9 w-[200px] text-xs">
            <SelectValue placeholder="Seleziona gruppo..." />
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
          variant={selectedGroupId ? "default" : "secondary"}
          className={cn(
            "h-9 px-4 whitespace-nowrap transition-all",
            selectedGroupId && "ring-2 ring-primary/20"
          )}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : null}
          Assegna
        </Button>
      </div>
      
      {/* Dialog visualizzazione email */}
      <SenderEmailsDialog
        open={showEmailsDialog}
        onOpenChange={setShowEmailsDialog}
        senderEmail={suggestion.sender_email}
        emailCount={emailCount}
      />
    </div>
  );
};
