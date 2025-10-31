import { ScrollArea } from '@/components/ui/scroll-area';
import { SmartEmailCard } from './SmartEmailCard';
import { ClassifiedEmail } from '@/types/smart-inbox';

interface SmartEmailListProps {
  emails: ClassifiedEmail[];
  onEmailClick: (email: ClassifiedEmail) => void;
  isLoading?: boolean;
}

export const SmartEmailList = ({ emails, onEmailClick, isLoading }: SmartEmailListProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Caricamento email...</p>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="text-6xl">📭</div>
          <h3 className="text-lg font-semibold">Nessuna email classificata</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Clicca su "Classifica Nuove" per iniziare a categorizzare le tue email automaticamente con l'AI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        {emails.map((classifiedEmail) => (
          <SmartEmailCard
            key={classifiedEmail.classification.id}
            classifiedEmail={classifiedEmail}
            onClick={() => onEmailClick(classifiedEmail)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};