import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { getCategoryColor, getCategoryIcon, extractInitials, extractCompanyName, formatDate } from '@/lib/smart-inbox-utils';

interface SmartEmailCardProps {
  classifiedEmail: ClassifiedEmail;
  onClick: () => void;
}

export const SmartEmailCard = ({ classifiedEmail, onClick }: SmartEmailCardProps) => {
  const { classification, email } = classifiedEmail;
  
  return (
    <Card 
      className="p-3 hover:bg-accent/50 cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={classification.sender_logo_url || undefined} />
          <AvatarFallback className="text-xs">
            {extractInitials(classification.sender_email)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm truncate">
              {extractCompanyName(classification.sender_email)}
            </span>
            <Badge 
              variant="secondary" 
              className="shrink-0 text-xs"
              style={{ 
                backgroundColor: getCategoryColor(classification.category),
                color: 'white'
              }}
            >
              <span className="mr-1">{getCategoryIcon(classification.category)}</span>
              {classification.category.split(' / ')[0]}
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-foreground truncate mb-1">
            {email.subject}
          </p>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {classification.ai_summary || email.body_preview?.substring(0, 120)}
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {formatDate(email.date)}
            </span>
            {classification.keywords?.slice(0, 3).map(kw => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};