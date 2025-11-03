import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryIcon, formatDate } from '@/lib/smart-inbox-utils';
import { getCategoryGradient, getCategoryGlow } from '@/lib/category-gradients';
import { Paperclip, Zap, ShoppingCart, FileText, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SenderGroupBadge } from './SenderGroupBadge';
import { useCompanyLogo } from '@/hooks/email/useCompanyLogo';

interface SmartEmailCardIntelligentProps {
  classifiedEmail: ClassifiedEmail;
  onClick: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

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
  
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);

  // ✅ Hook per logo aziendale alta qualità
  const { data: logoData } = useCompanyLogo(classification.sender_email);
  const logoUrl = logoData?.logo_url || classification.sender_logo_url;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-4 cursor-pointer transition-all duration-300 rounded-2xl",
        "bg-gradient-to-br from-[#1c1c28]/80 via-[#23233a]/60 to-[#0e0e18]/70",
        "backdrop-blur-md border border-white/10",
        "hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(0,200,255,0.1)]",
        isSelected && "ring-2 ring-primary"
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
        <div className="flex-shrink-0" onClick={onClick}>
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
        <div className="flex-1 min-w-0" onClick={onClick}>
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
            </div>
          </div>

          {/* Categoria con gradient glassmorphism */}
          <Badge 
            className={cn(
              "mb-2 rounded-full px-3 py-1 flex items-center gap-2 text-white border-0",
              getCategoryGradient(classification.category),
              getCategoryGlow(classification.category)
            )}
          >
            {getCategoryLucideIcon(classification.category)}
            <span className="text-base">{categoryIcon}</span>
            <span className="font-semibold">{classification.category}</span>
            {classification.confidence < 100 && (
              <span className="ml-2 text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                {Math.round(classification.confidence)}%
              </span>
            )}
          </Badge>

          {/* Riassunto AI */}
          {classification.ai_summary && (
            <p className="text-sm text-white/85 line-clamp-2 mb-1.5">
              {classification.ai_summary}
            </p>
          )}

          {/* Keywords intelligenti (max 2, qualità alta) */}
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
        </div>
      </div>
    </div>
  );
};
