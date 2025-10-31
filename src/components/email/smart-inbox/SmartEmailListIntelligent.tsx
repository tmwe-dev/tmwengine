import { ScrollArea } from '@/components/ui/scroll-area';
import { SmartEmailCardIntelligent } from './SmartEmailCardIntelligent';
import { ClassifiedEmail } from '@/types/smart-inbox';

interface SmartEmailListIntelligentProps {
  emails: ClassifiedEmail[];
  onEmailClick: (email: ClassifiedEmail) => void;
  isLoading?: boolean;
  selectedEmails: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

export const SmartEmailListIntelligent = ({ 
  emails, 
  onEmailClick, 
  isLoading,
  selectedEmails,
  onSelectionChange 
}: SmartEmailListIntelligentProps) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
        <div className="text-center space-y-3 p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Caricamento email...</p>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
        <div className="text-center space-y-3 p-8">
          <div className="text-6xl">📭</div>
          <h3 className="text-lg font-semibold">Nessuna email classificata</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Clicca su "Classifica Nuove" per iniziare a categorizzare le tue email automaticamente con l'AI.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleSelection = (uid: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(uid)) {
      newSelection.delete(uid);
    } else {
      newSelection.add(uid);
    }
    onSelectionChange(newSelection);
  };

  return (
    <div 
      className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      <ScrollArea className="h-full">
        <div className="p-8 space-y-6 overflow-visible">
          {emails.map((classifiedEmail) => (
            <SmartEmailCardIntelligent
              key={classifiedEmail.classification.id}
              classifiedEmail={classifiedEmail}
              onClick={() => onEmailClick(classifiedEmail)}
              isSelected={selectedEmails.has(classifiedEmail.email.uid)}
              onToggleSelect={() => handleToggleSelection(classifiedEmail.email.uid)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
