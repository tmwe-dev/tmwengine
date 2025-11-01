import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { getCategoryIcon, extractInitials, extractCompanyName, formatDate } from '@/lib/smart-inbox-utils';
import { getCategoryGradient, getCategoryGlow } from '@/lib/category-gradients';
import { cn } from '@/lib/utils';

interface SmartEmailCardProps {
  classifiedEmail: ClassifiedEmail;
  onClick: () => void;
}

export const SmartEmailCard = ({ classifiedEmail, onClick }: SmartEmailCardProps) => {
  const { classification, email } = classifiedEmail;
  
  return (
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
          
          <p className="text-sm font-medium text-white/90 truncate mb-1">
            {email.subject}
          </p>
          
          <p className="text-xs text-white/70 line-clamp-2 mb-1.5">
            {classification.ai_summary || email.body_preview?.substring(0, 120)}
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/60">
              {formatDate(email.date)}
            </span>
            {classification.keywords?.slice(0, 3).map(kw => (
              <Badge key={kw} className="text-xs bg-white/10 border border-white/15 text-white/90 rounded-full px-2 py-0.5">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};