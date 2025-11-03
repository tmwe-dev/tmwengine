import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { getCategoryIcon, extractInitials, extractCompanyName, formatDate } from '@/lib/smart-inbox-utils';
import { getCategoryGradient, getCategoryGlow } from '@/lib/category-gradients';
import { cn } from '@/lib/utils';
import { Reply, Archive, Sparkles, Target, AlertCircle, Calendar } from 'lucide-react';
import { useState } from 'react';

interface SmartEmailCardProps {
  classifiedEmail: ClassifiedEmail;
  onClick: () => void;
}

const TAG_ICONS: Record<string, string> = {
  'follow-up': '🔄',
  'urgente': '⚡',
  'meeting': '📅',
  'firma-richiesta': '✍️',
  'azione-richiesta': '🎯'
};

export const SmartEmailCard = ({ classifiedEmail, onClick }: SmartEmailCardProps) => {
  const { classification, email } = classifiedEmail;
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(classification.custom_prompt || '');
  
  const handlePromptSave = async () => {
    // TODO: Implementare salvataggio e riprocessamento
    console.log('Saving custom prompt:', customPrompt);
    setShowPromptDialog(false);
  };

  return (
    <>
      <div 
        className={cn(
          "p-3 cursor-pointer transition-all duration-300 rounded-lg",
          "bg-gradient-to-br from-[#1c1c28]/70 via-[#23233a]/50 to-[#0e0e18]/60",
          "backdrop-blur-sm border border-white/10",
          "hover:scale-[1.005] hover:shadow-[0_0_15px_rgba(0,200,255,0.08)]"
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/8 border border-white/15 p-0.5">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={classification.sender_logo_url || undefined} />
              <AvatarFallback className="text-xs">
                {extractInitials(classification.sender_email)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Riga 1: Nome + Categoria */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-sm truncate text-white/90">
                {extractCompanyName(classification.sender_email)}
              </span>
              <Badge 
                className={cn(
                  "shrink-0 text-xs text-white rounded-full px-2 py-0.5 border-0",
                  getCategoryGradient(classification.category),
                  getCategoryGlow(classification.category)
                )}
              >
                <span className="mr-1">{getCategoryIcon(classification.category)}</span>
                {classification.category.split(' / ')[0]}
              </Badge>
            </div>
            
            {/* Riga 2: Subject */}
            <p className="text-sm font-medium text-white/90 truncate mb-1">
              {email.subject}
            </p>
            
            {/* 🆕 Riga 3: TAG INTELLIGENTI */}
            {classification.tags && classification.tags.length > 0 && (
              <div className="flex gap-1.5 mb-1.5 flex-wrap">
                {classification.tags.map(tag => (
                  <Badge 
                    key={tag}
                    className="text-[10px] bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-full px-1.5 py-0"
                  >
                    {TAG_ICONS[tag]} {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* 🆕 Riga 4: RIASSUNTO STRUTTURATO */}
            <div className="text-xs text-white/90 space-y-0.5 mb-1.5">
              {classification.action_suggested && (
                <div className="flex items-start gap-1">
                  <Target className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
                  <span className="font-medium text-orange-300 leading-tight">
                    {classification.action_suggested}
                  </span>
                </div>
              )}
              {classification.ai_summary && (
                <p className="text-white/70 line-clamp-2 leading-tight pl-4">
                  {classification.ai_summary}
                </p>
              )}
            </div>
            
            {/* Riga 5: Keywords + Data */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs text-white/60">
                {formatDate(email.date)}
              </span>
              {classification.keywords?.slice(0, 3).map(kw => (
                <Badge key={kw} className="text-xs bg-white/10 border border-white/15 text-white/90 rounded-full px-2 py-0.5">
                  {kw}
                </Badge>
              ))}
            </div>
            
            {/* 🆕 Riga 6: AZIONI RAPIDE */}
            <div className="flex gap-1 pt-2 border-t border-white/10">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  // TODO: Implementare risposta
                }}
              >
                <Reply className="w-3 h-3 mr-1" /> Rispondi
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  // TODO: Implementare archivia
                }}
              >
                <Archive className="w-3 h-3 mr-1" /> Archivia
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs text-orange-400/80 hover:text-orange-300 hover:bg-orange-500/10"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowPromptDialog(true); 
                }}
              >
                <Sparkles className="w-3 h-3 mr-1" /> Prompt AI
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 🆕 DIALOG PROMPT CUSTOM */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="bg-[#1A1F2C] border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Prompt AI Personalizzato</DialogTitle>
            <DialogDescription className="text-white/70">
              Inserisci istruzioni specifiche per l'analisi AI di questa email
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            placeholder="Es: Estrai solo tracking number e date di consegna..."
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
    </>
  );
};
