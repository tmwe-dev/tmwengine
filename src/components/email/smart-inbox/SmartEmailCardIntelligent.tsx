import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryIcon, formatDate } from '@/lib/smart-inbox-utils';
import { getCategoryGradient, getCategoryGlow } from '@/lib/category-gradients';
import { Paperclip, Zap, ShoppingCart, FileText, Users, TrendingUp, AlertTriangle, Reply, Archive, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SenderGroupBadge } from './SenderGroupBadge';
import { useCompanyLogo } from '@/hooks/email/useCompanyLogo';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SmartEmailCardIntelligentProps {
  classifiedEmail: ClassifiedEmail;
  onClick: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const TAG_ICONS: Record<string, string> = {
  'follow-up': '🔄',
  'urgente': '⚡',
  'meeting': '📅',
  'firma-richiesta': '✍️',
  'azione-richiesta': '🎯'
};

const getCategoryLucideIcon = (category: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Fatture': <FileText className="h-4 w-4" />,
    'E-commerce': <ShoppingCart className="h-4 w-4" />,
    'Newsletter': <FileText className="h-4 w-4" />,
    'Social': <Users className="h-4 w-4" />,
    'Servizi': <Zap className="h-4 w-4" />,
    'Marketing': <TrendingUp className="h-4 w-4" />,
    'Marketing / Pubblicità': <TrendingUp className="h-4 w-4" />,
    'Spam': <AlertTriangle className="h-4 w-4" />,
    'Spam / Non Rilevante': <AlertTriangle className="h-4 w-4" />,
    'Bolle / Packing List': <FileText className="h-4 w-4" />,
    'Preventivi / Quotazioni': <FileText className="h-4 w-4" />,
    'Rate Aeree / Rate Navali': <TrendingUp className="h-4 w-4" />,
    'Documenti Spedizione': <FileText className="h-4 w-4" />,
    'Offerte di Lavoro': <Users className="h-4 w-4" />,
  };
  return iconMap[category] || <FileText className="h-4 w-4" />;
};

export const SmartEmailCardIntelligent = ({
  classifiedEmail, 
  onClick,
  isSelected,
  onToggleSelect 
}: SmartEmailCardIntelligentProps) => {
  const { classification, email } = classifiedEmail;
  const categoryIcon = getCategoryIcon(classification.category);
  const queryClient = useQueryClient();
  
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);

  // ✅ Hook per logo aziendale alta qualità
  const { data: logoData } = useCompanyLogo(classification.sender_email);
  const logoUrl = logoData?.logo_url || classification.sender_logo_url;

  // State per dialog custom prompt
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Carica custom_prompt esistente quando apri dialog
  const loadExistingPrompt = async () => {
    const { data } = await supabase
      .from('email_sender_ai_prompts')
      .select('custom_prompt_additions')
      .eq('sender_email', classification.sender_email)
      .single();
    
    setCustomPrompt(data?.custom_prompt_additions || '');
  };

  const handlePromptSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // UPSERT in email_sender_ai_prompts
      const { error: upsertError } = await supabase
        .from('email_sender_ai_prompts')
        .upsert({
          sender_email: classification.sender_email,
          user_id: user?.id,
          ai_prompt: 'Default classification prompt',
          custom_prompt_additions: customPrompt,
          is_active: true,
        }, {
          onConflict: 'sender_email'
        });

      if (upsertError) throw upsertError;

      // Riprocessa email con prompt aggiornato
      const { error: reprocessError } = await supabase.functions.invoke('reprocess-email-with-prompt', {
        body: {
          email_id: classification.email_uid,
          user_email: classification.user_email,
          sender_email: classification.sender_email
        }
      });

      if (reprocessError) throw reprocessError;

      toast.success('✅ Prompt salvato e email riprocessata');
      setShowPromptDialog(false);
      queryClient.invalidateQueries({ queryKey: ['smart-inbox-emails'] });
    } catch (error: any) {
      console.error('Errore salvataggio prompt:', error);
      toast.error(`❌ ${error.message}`);
    }
  };
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-4 cursor-pointer transition-all duration-300 rounded-2xl",
        "min-h-[clamp(240px,28vh,400px)]",
        "bg-gradient-to-br from-[#1c1c28]/80 via-[#23233a]/60 to-[#0e0e18]/70",
        "backdrop-blur-md border border-white/10",
        "hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(0,200,255,0.1)]",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* Diagonal light reflection */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent opacity-50" />
      </div>
      <div className="flex gap-3 relative z-10">
        {/* Checkbox per selezione multipla */}
        <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onToggleSelect}
          />
        </div>

        {/* Avatar mittente con glassmorphism wrapper */}
        <div className="flex-shrink-0">
          <div className="rounded-full bg-white/10 border border-white/20 p-1">
            <Avatar className="h-12 w-12">
              {logoUrl ? (
                <AvatarImage src={logoUrl} alt={companyName} />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Contenuto email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-sm truncate text-white/90">{companyName}</h3>
                
                {/* Badge Gruppo Mittente */}
                {(classification as any).sender_group && (
                  <SenderGroupBadge
                    groupName={(classification as any).sender_group.name}
                    groupIcon={(classification as any).sender_group.icon}
                    groupColor={(classification as any).sender_group.color}
                  />
                )}
              </div>
              <p className="text-xs text-white/70 truncate">
                {classification.sender_email}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {email.has_attachments && (
                <Paperclip className="h-4 w-4 text-white/60" />
              )}
              <span className="text-xs text-white/60 whitespace-nowrap">
                {formatDate(email.date)}
              </span>
              {/* Icona categoria */}
              <span className="text-white/80" title={classification.category}>
                {getCategoryLucideIcon(classification.category)}
              </span>
            </div>
          </div>

          {/* TAG INTELLIGENTI */}
          {classification.tags && classification.tags.length > 0 && (
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {classification.tags.map((tag: string) => (
                <Badge 
                  key={tag}
                  className="text-[10px] bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-full px-1.5 py-0"
                >
                  {TAG_ICONS[tag] || '🏷️'} {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* AZIONE SUGGERITA */}
          {classification.action_suggested && (
            <div className="flex items-start gap-1.5 mb-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
              <Target className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-orange-300 leading-tight">
                {classification.action_suggested}
              </span>
            </div>
          )}

          {/* Riassunto AI */}
          {classification.ai_summary && (
            <p className="text-xs text-white/70 leading-tight mb-2 overflow-y-auto max-h-[120px]">
              {classification.ai_summary}
            </p>
          )}

          {/* Keywords intelligenti (max 2, qualità alta) */}
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {classification.keywords
                .filter(kw => 
                  kw.length > 3 && 
                  (/\d/.test(kw) || classification.confidence >= 85)
                )
                .slice(0, 2)
                .map((keyword, idx) => (
                  <Badge key={idx} className="text-xs bg-white/10 border border-white/15 text-white/90 rounded-full px-2 py-0.5">
                    {keyword}
                  </Badge>
                ))
              }
            </div>
          )}

          {/* AZIONI RAPIDE */}
          <div className="flex gap-1 pt-2 border-t border-white/10 mt-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); }}
            >
              <Reply className="w-3 h-3 mr-1" /> Rispondi
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); }}
            >
              <Archive className="w-3 h-3 mr-1" /> Archivia
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs text-orange-400/80 hover:text-orange-300 hover:bg-orange-500/10"
              onClick={(e) => { 
                e.stopPropagation(); 
                loadExistingPrompt();
                setShowPromptDialog(true); 
              }}
            >
              <Sparkles className="w-3 h-3 mr-1" /> Prompt AI
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG PROMPT CUSTOM */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="bg-[#1A1F2C] border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">
              Prompt AI per {classification.sender_email}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Aggiungi istruzioni specifiche per tutte le email di questo mittente
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            placeholder="Es: Estrai sempre tracking AWB e date di consegna. Evidenzia se urgente."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="bg-white/5 border-white/20 text-white min-h-[120px]"
          />
          <DialogFooter>
            <Button 
              onClick={handlePromptSave}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Salva e Riprocessa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
