import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailHeader } from "@/components/tmwe/EmailHeader";
import { EmailSidebar } from "@/components/tmwe/EmailSidebar";
import { EmailList } from "@/components/tmwe/EmailList";
import { EmailDetail } from "@/components/tmwe/EmailDetail";
import { ComposeDialog } from "@/components/tmwe/ComposeDialog";
import { emailApi } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

const TMWEEmailBackup = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEmailList, setShowEmailList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<{ 
    uid: string; 
    to: string; 
    subject: string; 
    originalBody: string; 
    originalFrom: string; 
    originalDate: string; 
    isForward?: boolean 
  } | undefined>(undefined);

  // Handle email selection on mobile
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
    if (isMobile) {
      setShowEmailList(false);
    }
  };

  const handleBackToList = () => {
    setSelectedEmailId(null);
    setShowEmailList(true);
  };

  // Fetch folders from database
  const { data: foldersData } = useQuery({
    queryKey: ["email-folders-backup"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tmwe_email")
        .eq("user_id", user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error("No email configured");

      const { data: folders } = await supabase
        .from("email_messages")
        .select("cartella")
        .eq("user_email", profile.tmwe_email);

      const folderCounts = (folders || []).reduce((acc, { cartella }) => {
        acc[cartella] = (acc[cartella] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(folderCounts).map(([name, count]) => ({
        name,
        messages: count,
        unread: 0,
      }));
    },
  });

  // Fetch messages from database
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["email-messages-backup", selectedFolder, searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tmwe_email")
        .eq("user_id", user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error("No email configured");

      let query = supabase
        .from("email_messages")
        .select("*", { count: "exact" })
        .eq("cartella", selectedFolder)
        .eq("user_email", profile.tmwe_email)
        .order("data_ricezione", { ascending: false })
        .range(0, 99);

      if (searchQuery) {
        query = query.or(`subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        messages: (data || []).map((msg) => ({
          id: msg.id,
          subject: msg.subject || "(No Subject)",
          from: msg.from_email,
          preview: msg.body_text?.substring(0, 100) || "",
          date: msg.data_ricezione,
          read: msg.stato === 'letto',
          starred: false,
          hasAttachments: Array.isArray(msg.attachments) && msg.attachments.length > 0,
        })),
        total: count || 0,
      };
    },
  });

  // Fetch email detail from database
  const { data: emailDetailResponse } = useQuery({
    queryKey: ["email-detail-backup", selectedEmailId],
    queryFn: async () => {
      if (!selectedEmailId) return null;

      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("id", selectedEmailId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        message_id: data.message_id,
        uid: data.id,
        subject: data.subject || "(No Subject)",
        from: data.from_email,
        to: [data.to_email],
        cc: data.cc_email ? [data.cc_email] : [],
        date: data.data_ricezione,
        body: data.body_html || data.body_text,
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
      };
    },
    enabled: !!selectedEmailId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      await emailApi.deleteMessages(messageIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-messages-backup"] });
      queryClient.invalidateQueries({ queryKey: ["email-folders-backup"] });
      setSelectedEmailId(null);
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
    if (!selectedEmailId) return;
    if (confirm("Sei sicuro di voler eliminare questa email?")) {
      deleteMutation.mutate([selectedEmailId]);
    }
  };

  const handleBulkDelete = async (messageIds: string[]) => {
    deleteMutation.mutate(messageIds);
  };

  const globalEmailCount = useMemo(() => {
    return (foldersData || []).reduce((sum, folder) => sum + folder.messages, 0);
  }, [foldersData]);

  const emails = messagesData?.messages || [];

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20">
      <EmailHeader
        onSearch={setSearchQuery}
      />

      <div className="px-4 py-3 border-b bg-blue-500/10 border-blue-500/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground">
              📦 Email Backup (Database)
            </div>
            <Badge variant="secondary">
              {messagesData?.total || 0} email in {selectedFolder}
            </Badge>
          </div>
          <Button
            onClick={() => navigate('/email-manager')}
            variant="default"
            size="sm"
            className="gap-2 shrink-0"
          >
            🌐 Vai al Server Live
          </Button>
        </div>
        {(!messagesData?.total || messagesData.total === 0) && (
          <div className="mt-2 text-xs text-muted-foreground">
            💡 Non ci sono email nel backup. Vai al Server Live per scaricare le email dal server.
          </div>
        )}
      </div>

      <div className="flex flex-1 min-w-0 overflow-hidden">
        <EmailSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onCompose={() => setComposeOpen(true)}
        />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className={`${showEmailList || !isMobile ? 'flex' : 'hidden'} flex-col border-r w-full md:w-96 flex-shrink-0`}>
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmailId}
              onEmailSelect={handleEmailSelect}
              onBulkDelete={handleBulkDelete}
              onBulkArchive={() => {}}
              onBulkForward={() => {}}
              onBulkMarkAsRead={() => {}}
              onBulkMoveToFolder={() => {}}
              loading={messagesLoading}
            />
          </div>

          <div className={`${!showEmailList || !isMobile ? 'flex' : 'hidden'} flex-1 flex-col`}>
            {selectedEmailId && emailDetailResponse ? (
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
                  <p className="text-lg">📦 Email Backup</p>
                  <p className="text-sm">Seleziona un'email per visualizzarla</p>
                  <p className="text-xs text-muted-foreground/60">
                    {globalEmailCount} email nel database
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

export default TMWEEmailBackup;
