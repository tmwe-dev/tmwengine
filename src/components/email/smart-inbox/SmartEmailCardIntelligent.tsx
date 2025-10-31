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
      blur="md"
      gradient={true}
      glossy={true}
      onClick={onClick}
      className={`p-4 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/20 transition-all duration-200 ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex gap-3">
        {/* Checkbox per selezione multipla */}
        <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onToggleSelect}
          />
        </div>

        {/* Avatar mittente */}
        <div className="flex-shrink-0" onClick={onClick}>
          <Avatar className="h-12 w-12 border-2 border-white/20">
            {classification.sender_logo_url ? (
              <AvatarImage src={classification.sender_logo_url} alt={companyName} />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Contenuto email */}
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{companyName}</h3>
                {isVerified ? (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    Verificata
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                    Da Verificare
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {classification.sender_email}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {email.has_attachments && (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(email.date)}
              </span>
            </div>
          </div>

          {/* Categoria */}
          <Badge 
            className="mb-2 rounded-full px-3 py-1.5 flex items-center gap-2"
            style={{ 
              backgroundColor: categoryColor, 
              color: 'white',
              borderColor: categoryColor
            }}
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
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {classification.ai_summary}
            </p>
          )}

          {/* Keywords */}
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {classification.keywords.slice(0, 3).map((keyword, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
