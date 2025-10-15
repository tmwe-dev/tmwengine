import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTMWEAuth } from "@/hooks/useTMWEAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailHeader } from "@/components/tmwe/EmailHeader";
import { EmailSidebar } from "@/components/tmwe/EmailSidebar";
import { EmailList } from "@/components/tmwe/EmailList";
import { EmailDetail } from "@/components/tmwe/EmailDetail";
import { ComposeDialog } from "@/components/tmwe/ComposeDialog";
import { emailApi } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * 🌐 EMAIL MANAGER - Finestra LIVE sul server TMWE
 * 
 * ✅ USA SOLO:
 * - emailFolderApi.getFolders() per cartelle
 * - emailMessageApi.getMessages() per lista email (senza body)
 * - emailMessageApi.getMessage(uid) per body singolo
 * 
 * ❌ NON USA MAI:
 * - supabase.from('email_messages')
 * - supabase.functions.invoke('tmwe-email-folders')
 * - supabase.functions.invoke('tmwe-email-sync-master')
 */
const TMWEEmailManager = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { userEmail } = useTMWEAuth();
  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedEmailUid, setSelectedEmailUid] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmailList, setShowEmailList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [replyTo, setReplyTo] = useState<{
    uid: string; 
    to: string; 
    subject: string; 
    originalBody: string; 
    originalFrom: string; 
    originalDate: string; 
    isForward?: boolean 
  } | undefined>(undefined);

  const EMAILS_PER_PAGE = 50;

  // Handle email selection on mobile
  const handleEmailSelect = (emailUid: string) => {
    setSelectedEmailUid(emailUid);
    if (isMobile) {
      setShowEmailList(false);
    }
  };

  const handleBackToList = () => {
    setSelectedEmailUid(null);
    setShowEmailList(true);
  };

  // 🌐 Fetch folders from TMWE API
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["email-folders-live"],
    queryFn: async () => {
      const folders = await emailApi.getFolders();
      return folders;
    },
    enabled: !!userEmail,
  });

  // 🌐 Fetch messages from TMWE API (without body)
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["email-messages-live", selectedFolder, currentPage, searchQuery],
    queryFn: async () => {
      const response = await emailApi.getEmails(
        selectedFolder,
        currentPage,
        EMAILS_PER_PAGE,
        searchQuery || undefined
      );

      return {
        messages: (response.messages || []).map((msg: any) => ({
          id: msg.uid?.toString() || msg.msgno?.toString(),
          uid: msg.uid,
          subject: msg.subject || "(No Subject)",
          from: msg.from,
          preview: "", // No body in list view
          date: msg.date,
          read: msg.seen === 1,
          starred: msg.flagged === 1,
          hasAttachments: msg.has_attachments === 1,
        })),
        total: response.total || 0,
      };
    },
    enabled: !!userEmail,
  });

  // 🌐 Fetch single email detail from TMWE API (with body)
  const { data: emailDetailResponse } = useQuery({
    queryKey: ["email-detail-live", selectedEmailUid],
    queryFn: async () => {
      if (!selectedEmailUid) return null;

      const detail = await emailApi.getEmailDetail(selectedEmailUid);
      
      return {
        id: detail.uid?.toString() || selectedEmailUid,
        message_id: detail.message_id,
        uid: detail.uid,
        subject: detail.subject || "(No Subject)",
        from: detail.from,
        to: Array.isArray(detail.to) ? detail.to : [detail.to],
        cc: Array.isArray(detail.cc) ? detail.cc : [],
        date: detail.date,
        body: detail.body_html || detail.body,
        attachments: detail.attachments || [],
      };
    },
    enabled: !!selectedEmailUid,
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      await emailApi.deleteMessages(messageIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-messages-live"] });
      queryClient.invalidateQueries({ queryKey: ["email-folders-live"] });
      setSelectedEmailUid(null);
      toast.success("Email eliminata con successo");
    },
    onError: () => {
      toast.error("Errore durante l'eliminazione");
    },
  });

  const handleReply = () => {
    if (!emailDetailResponse) return;
    setReplyTo({
      uid: emailDetailResponse.id,
      to: emailDetailResponse.from,
      subject: `Re: ${emailDetailResponse.subject}`,
      originalBody: emailDetailResponse.body || '',
      originalFrom: emailDetailResponse.from,
      originalDate: emailDetailResponse.date,
    });
    setComposeOpen(true);
  };

  const handleReplyAll = () => {
    if (!emailDetailResponse) return;
    const allRecipients = [emailDetailResponse.from, ...emailDetailResponse.to, ...emailDetailResponse.cc]
      .filter(Boolean)
      .join(", ");
    setReplyTo({
      uid: emailDetailResponse.id,
      to: allRecipients,
      subject: `Re: ${emailDetailResponse.subject}`,
      originalBody: emailDetailResponse.body || '',
      originalFrom: emailDetailResponse.from,
      originalDate: emailDetailResponse.date,
    });
    setComposeOpen(true);
  };

  const handleForward = () => {
    if (!emailDetailResponse) return;
    setReplyTo({
      uid: emailDetailResponse.id,
      to: '',
      subject: `Fwd: ${emailDetailResponse.subject}`,
      originalBody: emailDetailResponse.body || '',
      originalFrom: emailDetailResponse.from,
      originalDate: emailDetailResponse.date,
      isForward: true,
    });
    setComposeOpen(true);
  };

  const handleDelete = () => {
    if (!selectedEmailUid) return;
    if (confirm("Sei sicuro di voler eliminare questa email?")) {
      deleteMutation.mutate([selectedEmailUid]);
    }
  };

  const handleBulkDelete = async (messageIds: string[]) => {
    deleteMutation.mutate(messageIds);
  };

  const emails = messagesData?.messages || [];
  const totalEmails = messagesData?.total || 0;
  const totalPages = Math.ceil(totalEmails / EMAILS_PER_PAGE);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20">
      <EmailHeader
        onSearch={setSearchQuery}
      />

      <div className="px-4 py-3 border-b bg-green-500/10 border-green-500/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground">
              🌐 Email Manager (Server Live)
            </div>
            <Badge variant="secondary">
              {totalEmails} email su server
            </Badge>
          </div>
          <Button
            onClick={() => navigate('/email-backup')}
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
          >
            📦 Backup Database
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          💡 Vista in tempo reale. Le email non sono salvate localmente.
        </div>
      </div>

      <div className="flex flex-1 min-w-0 overflow-hidden">
        <EmailSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={(folder) => {
            setSelectedFolder(folder);
            setCurrentPage(1);
          }}
          onCompose={() => setComposeOpen(true)}
          folders={foldersData || []}
          dbEmailCount={0}
        />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className={`${showEmailList || !isMobile ? 'flex' : 'hidden'} flex-col border-r w-full md:w-96 flex-shrink-0`}>
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmailUid}
              onEmailSelect={handleEmailSelect}
              onBulkDelete={handleBulkDelete}
              onBulkArchive={() => {}}
              onBulkForward={() => {}}
              onBulkMarkAsRead={() => {}}
              onBulkMoveToFolder={() => {}}
              loading={messagesLoading}
            />
            
            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Indietro
                </Button>
                <span className="text-xs text-muted-foreground">
                  Pagina {currentPage} di {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Avanti →
                </Button>
              </div>
            )}
          </div>

          <div className={`${!showEmailList || !isMobile ? 'flex' : 'hidden'} flex-1 flex-col`}>
            {selectedEmailUid && emailDetailResponse ? (
              <EmailDetail
                email={emailDetailResponse}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onDelete={handleDelete}
                onBack={handleBackToList}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <p className="text-lg">🌐 Email Manager</p>
                  <p className="text-sm">Seleziona un'email per visualizzarla</p>
                  <p className="text-xs text-muted-foreground/60">
                    Vista live dal server TMWE
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComposeDialog
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyTo(undefined);
        }}
        replyTo={replyTo}
      />
    </div>
  );
};

export default TMWEEmailManager;
