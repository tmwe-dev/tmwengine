/**
 * Top bar for email list with search and sender filter
 * Includes AI chat integration for sender-specific conversations
 */
import { Input } from '@/components/ui/input';
import { EmailSenderFilter } from './EmailSenderFilter';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { Search } from 'lucide-react';

interface EmailTopBarProps {
  isMobile: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  emailsFromPages: any[];
  selectedSender: string | null;
  setSelectedSender: (sender: string | null) => void;
  setSelectedAIChatSender: (sender: string) => void;
  setAiChatOpen: (open: boolean) => void;
  emails: any[];
}

export const EmailTopBar = ({
  isMobile,
  searchQuery,
  setSearchQuery,
  emailsFromPages,
  selectedSender,
  setSelectedSender,
  setSelectedAIChatSender,
  setAiChatOpen,
  emails,
}: EmailTopBarProps) => {
  return (
    <>
      {/* Mobile Search Bar */}
      {isMobile && (
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Email Sender Filter + AI Chat */}
      <div className="border-b bg-card-transparent backdrop-blur-sm">
        <EmailSenderFilter 
          emails={emailsFromPages}
          selectedSender={selectedSender}
          onSenderSelect={(sender) => {
            console.log('🎯 Sender selected:', sender);
            setSelectedSender(sender);
          }}
          onOpenAIChat={(sender) => {
            console.log('🤖 Opening AI chat for sender:', sender);
            setSelectedAIChatSender(sender);
            setAiChatOpen(true);
          }}
        />
        <UnifiedAICommunicationBadge 
          pageRoute="/email-manager"
        />
      </div>
    </>
  );
};
