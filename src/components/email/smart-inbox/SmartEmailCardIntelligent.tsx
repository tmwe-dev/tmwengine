import { GlassCard } from '@/components/design-system/cards/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, getCategoryColor, getCategoryIcon, formatDate } from '@/lib/smart-inbox-utils';
import { Paperclip, CheckCircle2, AlertCircle, Zap, ShoppingCart, FileText, Users, TrendingUp, AlertTriangle } from 'lucide-react';

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
  const categoryColor = getCategoryColor(classification.category);
  const categoryIcon = getCategoryIcon(classification.category);
  
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);

  const isVerified = classification.is_verified && classification.confidence >= 80;
  
  return (
    <GlassCard 
      blur="lg"
      glossy={true}
      className={`p-0 overflow-hidden hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/30 hover:border-white/30 transition-all duration-300 ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      {/* Header - Avatar + Nome + Badge Verifica */}
      <div className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md p-3 sm:p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Checkbox per selezione multipla */}
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={onToggleSelect}
              className="bg-white/20 border-white/40"
            />
          </div>

          {/* Avatar mittente */}
          <Avatar className="h-12 w-12 border-2 border-white/30 ring-2 ring-white/10">
            {classification.sender_logo_url ? (
              <AvatarImage src={classification.sender_logo_url} alt={companyName} />
            ) : null}
            <AvatarFallback className="text-xs font-bold bg-primary/30 backdrop-blur-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Nome e Email */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-white truncate">{companyName}</h3>
            <p className="text-xs text-white/70 truncate">
              {classification.sender_email}
            </p>
          </div>

          {/* Badge Verifica */}
          {isVerified ? (
            <Badge className="bg-green-500/80 backdrop-blur-sm border-green-400/30 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verificata
            </Badge>
          ) : (
            <Badge className="bg-orange-500/80 backdrop-blur-sm border-orange-400/30 text-white">
              <AlertCircle className="h-3 w-3 mr-1" />
              Da Verificare
            </Badge>
          )}

          {/* Data e Allegati */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {email.has_attachments && (
              <Paperclip className="h-4 w-4 text-white/60" />
            )}
            <span className="text-xs text-white/70 whitespace-nowrap">
              {formatDate(email.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Body - Summary e Categoria */}
      <div className="p-3 sm:p-4 bg-white/5 backdrop-blur-sm space-y-3" onClick={onClick}>
        {/* Categoria Badge */}
        <Badge 
          className="rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur-md border-2"
          style={{ 
            backgroundColor: `${categoryColor}80`,
            borderColor: `${categoryColor}`,
            color: 'white'
          }}
        >
          {getCategoryLucideIcon(classification.category)}
          <span className="text-base">{categoryIcon}</span>
          <span className="font-semibold">{classification.category}</span>
          {classification.confidence < 100 && (
            <span className="ml-2 text-xs font-bold bg-white/30 px-1.5 py-0.5 rounded-full">
              {Math.round(classification.confidence)}%
            </span>
          )}
        </Badge>

        {/* Riassunto AI */}
        {classification.ai_summary && (
          <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
            {classification.ai_summary}
          </p>
        )}
      </div>

      {/* Footer - Keywords */}
      {classification.keywords && classification.keywords.length > 0 && (
        <div className="p-2 sm:p-3 bg-black/20 backdrop-blur-sm border-t border-white/10" onClick={onClick}>
          <div className="flex flex-wrap gap-2">
            {classification.keywords.slice(0, 3).map((keyword, idx) => (
              <Badge 
                key={idx} 
                className="text-xs bg-white/20 backdrop-blur-md border border-white/20 text-white hover:bg-white/30"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
