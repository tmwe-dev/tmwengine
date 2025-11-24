/**
 * Card per visualizzare suggerimenti AI di raggruppamento mittenti
 * Con logo aziendale, bandiera paese, badge cliente/WCA
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Check, X, Sparkles, TrendingUp, Building2, Star, Users, Loader2 } from 'lucide-react';
import type { GroupingSuggestion } from '@/types/email-management';
import { cn } from '@/lib/utils';
import { useCompanyLogo } from '@/hooks/email/useCompanyLogo';
import { extractInitials } from '@/lib/smart-inbox-utils';
import { detectCountryFromEmail, getCountryFlag, getCountryName } from '@/lib/email-utils';
import { isWCAPartner } from '@/data/wca-partners';
import { getTransportConfig, getContentConfig } from '@/lib/email-transport-utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SenderEmailsDialog } from './SenderEmailsDialog';

interface GroupingSuggestionCardProps {
  suggestion: GroupingSuggestion;
  onAccept: (suggestionId: string, groupId: string | null, groupName: string) => void;
  onDismiss: (suggestionId: string) => void;
  disabled?: boolean;
  emailCount?: number;
  onGroupClick?: (groupName: string) => void;
}

export const GroupingSuggestionCard = ({
  suggestion,
  onAccept,
  onDismiss,
  disabled = false,
  emailCount,
  onGroupClick,
}: GroupingSuggestionCardProps) => {
  // State per processing, debouncing e dialog email
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmailsDialog, setShowEmailsDialog] = useState(false);
  const lastClickTime = useRef<number>(0);
  
  // 🆕 Hook per logo aziendale
  const { data: logoData } = useCompanyLogo(suggestion.sender_email);
  
  // 🆕 Rilevamento paese da email
  const countryCode = detectCountryFromEmail(suggestion.sender_email);
  const countryFlag = getCountryFlag(countryCode);
  
  // 🆕 Check WCA Partner
  const isWCA = isWCAPartner(suggestion.sender_email);
  
  // 🆕 Query rubrica per badge Cliente/WCA/Partner
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
    staleTime: 1000 * 60 * 5, // Cache 5 min
  });
  
  const initials = extractInitials(suggestion.sender_email);
  
  // Handler con debouncing
  const handleAccept = async (groupId: string | null, groupName: string) => {
    const now = Date.now();
    
    if (now - lastClickTime.current < 1000) {
      console.log('⏭️ Click troppo rapido, ignorato');
      return;
    }
    
    lastClickTime.current = now;
    setIsProcessing(true);
    
    try {
      await onAccept(suggestion.id, groupId, groupName);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDismiss = async () => {
    const now = Date.now();
    
    if (now - lastClickTime.current < 1000) {
      console.log('⏭️ Click troppo rapido, ignorato');
      return;
    }
    
    lastClickTime.current = now;
    setIsProcessing(true);
    
    try {
      await onDismiss(suggestion.id);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-3 mb-4">
        {/* 🆕 Logo aziendale */}
        <Avatar className="h-14 w-14 border border-border">
          {logoData?.logo_url ? (
            <AvatarImage src={logoData.logo_url} alt={suggestion.sender_email} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 
              className="font-medium text-sm flex items-center gap-1.5 truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => setShowEmailsDialog(true)}
              title="Clicca per vedere le email"
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{suggestion.sender_email}</span>
            </h4>
            
            {/* 🆕 Bandiera paese */}
            {countryFlag && (
              <span className="text-base flex-shrink-0" title={countryCode || undefined}>
                {countryFlag}
              </span>
            )}
            
            {/* 🆕 Badge conteggio email */}
            {emailCount !== undefined && emailCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-info/10 text-info">
                <Mail className="w-3 h-3 mr-1" />
                {emailCount}
              </Badge>
            )}
          </div>
          
          {/* 🆕 Badges contestuali */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
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
                WCA Partner
              </Badge>
            )}
            
            {/* 🆕 BADGE TRASPORTO */}
            {suggestion.suggested_groups[0]?.transport_type && (() => {
              const config = getTransportConfig(suggestion.suggested_groups[0].transport_type);
              if (!config) return null;
              return (
                <Badge variant="secondary" className={cn('text-xs font-medium', config.color)}>
                  {config.emoji} {config.label}
                </Badge>
              );
            })()}

            {/* 🆕 BADGE CONTENUTO */}
            {suggestion.suggested_groups[0]?.content_type && (() => {
              const config = getContentConfig(suggestion.suggested_groups[0].content_type);
              if (!config) return null;
              return (
                <Badge variant="secondary" className={cn('text-xs font-medium', config.color)}>
                  {config.emoji} {config.label}
                </Badge>
              );
            })()}

            {/* 🆕 BADGE PAESE AI (se confidence > 0.7 e diverso da TLD) */}
            {suggestion.suggested_groups[0]?.country_code && 
             suggestion.suggested_groups[0]?.country_confidence && 
             suggestion.suggested_groups[0].country_confidence > 0.7 && 
             suggestion.suggested_groups[0].country_code !== countryCode && (
              <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-700 border-violet-500/20">
                {getCountryFlag(suggestion.suggested_groups[0].country_code)} {getCountryName(suggestion.suggested_groups[0].country_code)}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            Analizzato {new Date(suggestion.analyzed_at).toLocaleString('it-IT', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestion.suggested_groups.map((group, index) => {
          const confidencePercent = Math.round(group.confidence * 100);
          const confidenceColor =
            group.confidence >= 0.8
              ? 'text-success bg-success/10'
              : group.confidence >= 0.6
              ? 'text-warning bg-warning/10'
              : 'text-muted-foreground bg-muted';

          return (
            <div
              key={index}
              className={cn(
                'p-3 rounded-lg border transition-all',
                index === 0 ? 'bg-card border-primary/30' : 'bg-muted/50 border-border/50'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors hover:underline"
                      onClick={() => onGroupClick?.(group.group_name)}
                      title="Clicca per filtrare per questo gruppo"
                    >
                      {group.group_name}
                    </span>
                    {group.group_id === null && (
                      <Badge variant="outline" className="text-xs">
                        Nuovo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{group.reason}</p>
                </div>
                <Badge variant="secondary" className={cn('text-xs font-medium', confidenceColor)}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {confidencePercent}%
                </Badge>
              </div>

              {index === 0 && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(group.group_id, group.group_name)}
                    disabled={disabled || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Accetta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAccept(group.group_id, group.group_name)}
                    disabled={disabled || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              )}

              {index > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAccept(group.group_id, group.group_name)}
                  disabled={disabled || isProcessing}
                  className="w-full mt-2 text-xs h-7"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  Usa questo
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        disabled={disabled || isProcessing}
        className="w-full mt-3 text-xs text-muted-foreground hover:text-destructive"
      >
        {isProcessing ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <X className="w-3 h-3 mr-1" />
        )}
        Ignora suggerimenti
      </Button>
      
      {/* Dialog visualizzazione email */}
      <SenderEmailsDialog
        open={showEmailsDialog}
        onOpenChange={setShowEmailsDialog}
        senderEmail={suggestion.sender_email}
        emailCount={emailCount}
      />
    </Card>
  );
};
