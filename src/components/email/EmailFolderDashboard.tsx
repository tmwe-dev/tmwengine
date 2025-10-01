import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Folder, 
  Mail, 
  Inbox, 
  Send, 
  Archive, 
  Trash2, 
  Clock, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface EmailFolder {
  name: string;
  count: number;
  unread: number;
  recent: number;
  icon: React.ReactNode;
  color: string;
}

interface EmailMessage {
  id: string;
  subject: string;
  from_email: string;
  to_email: string;
  data_ricezione: string;
  stato: string;
  cartella: string;
  body_text: string;
  body_html: string;
  message_id: string;
  direzione: 'inbound' | 'outbound';
}

interface FolderStats {
  totalEmails: number;
  unreadEmails: number;
  todayEmails: number;
  weekEmails: number;
  inboundEmails: number;
  outboundEmails: number;
  avgDaily: number;
}

export const EmailFolderDashboard: React.FC = () => {
  const { toast } = useToast();
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState<FolderStats>({
    totalEmails: 0,
    unreadEmails: 0,
    todayEmails: 0,
    weekEmails: 0,
    inboundEmails: 0,
    outboundEmails: 0,
    avgDaily: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);

  const getFolderIcon = (folderName: string) => {
    switch (folderName.toLowerCase()) {
      case 'inbox': return <Inbox className="h-4 w-4" />;
      case 'sent': case 'inviata': return <Send className="h-4 w-4" />;
      case 'archive': case 'archiviata': return <Archive className="h-4 w-4" />;
      case 'trash': case 'cestino': return <Trash2 className="h-4 w-4" />;
      case 'draft': case 'bozze': return <Mail className="h-4 w-4" />;
      default: return <Folder className="h-4 w-4" />;
    }
  };

  const getFolderColor = (folderName: string) => {
    switch (folderName.toLowerCase()) {
      case 'inbox': return 'text-blue-600';
      case 'sent': case 'inviata': return 'text-green-600';
      case 'archive': case 'archiviata': return 'text-orange-600';
      case 'trash': case 'cestino': return 'text-red-600';
      case 'draft': case 'bozze': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const fetchFolders = useCallback(async () => {
    try {
      const { data: folderData, error } = await supabase
        .from('email_messages')
        .select('cartella, stato, data_ricezione, direzione')
        .order('cartella');

      if (error) {
        console.error('Errore nel recupero cartelle:', error);
        return;
      }

      // Raggruppa le email per cartella
      const folderMap = new Map<string, {
        total: number;
        unread: number;
        recent: number;
      }>();

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      folderData?.forEach(email => {
        const folder = email.cartella || 'INBOX';
        const current = folderMap.get(folder) || { total: 0, unread: 0, recent: 0 };
        
        current.total++;
        if (email.stato === 'nuovo') current.unread++;
        
        const emailDate = new Date(email.data_ricezione);
        if (emailDate >= yesterday) current.recent++;
        
        folderMap.set(folder, current);
      });

      const foldersArray: EmailFolder[] = Array.from(folderMap.entries()).map(([name, stats]) => ({
        name,
        count: stats.total,
        unread: stats.unread,
        recent: stats.recent,
        icon: getFolderIcon(name),
        color: getFolderColor(name)
      }));

      // Ordina le cartelle per priorità
      const folderOrder = ['INBOX', 'Sent', 'Draft', 'Archive', 'Trash'];
      foldersArray.sort((a, b) => {
        const aIndex = folderOrder.indexOf(a.name);
        const bIndex = folderOrder.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      setFolders(foldersArray);
    } catch (error) {
      console.error('Errore nel caricamento cartelle:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le cartelle",
        variant: "destructive"
      });
    }
  }, [toast]);

  const fetchEmailsForFolder = useCallback(async (folderName: string) => {
    try {
      setLoading(true);
      const { data: emailData, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('cartella', folderName)
        .order('data_ricezione', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Errore nel recupero email:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare le email",
          variant: "destructive"
        });
        return;
      }

      setEmails((emailData || []).map(email => ({
        ...email,
        direzione: (email.direzione === 'inbound' || email.direzione === 'outbound') 
          ? email.direzione 
          : 'inbound'
      }) as EmailMessage));
    } catch (error) {
      console.error('Errore nel caricamento email:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const calculateStats = useCallback(async () => {
    try {
      const { data: allEmails, error } = await supabase
        .from('email_messages')
        .select('data_ricezione, stato, direzione');

      if (error) {
        console.error('Errore nel calcolo statistiche:', error);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: FolderStats = {
        totalEmails: allEmails?.length || 0,
        unreadEmails: allEmails?.filter(e => e.stato === 'nuovo').length || 0,
        todayEmails: allEmails?.filter(e => new Date(e.data_ricezione) >= today).length || 0,
        weekEmails: allEmails?.filter(e => new Date(e.data_ricezione) >= week).length || 0,
        inboundEmails: allEmails?.filter(e => e.direzione === 'inbound').length || 0,
        outboundEmails: allEmails?.filter(e => e.direzione === 'outbound').length || 0,
        avgDaily: allEmails?.length ? Math.round((allEmails.length / 30)) : 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Errore nel calcolo statistiche:', error);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
    calculateStats();
  }, [fetchFolders, calculateStats]);

  useEffect(() => {
    if (selectedFolder) {
      fetchEmailsForFolder(selectedFolder);
    }
  }, [selectedFolder, fetchEmailsForFolder]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Ora';
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
  };

  const getStatusIcon = (stato: string) => {
    switch (stato) {
      case 'nuovo': return <Mail className="h-4 w-4 text-blue-600" />;
      case 'letto': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'risposto': return <Send className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header e Statistiche Generali */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Totali</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmails}</div>
            <p className="text-xs text-muted-foreground">
              {stats.avgDaily} email/giorno (media)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non Lette</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unreadEmails}</div>
            <p className="text-xs text-muted-foreground">
              Da processare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oggi</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todayEmails}</div>
            <p className="text-xs text-muted-foreground">
              Questa settimana: {stats.weekEmails}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traffico</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inboundEmails + stats.outboundEmails}</div>
            <div className="flex text-xs text-muted-foreground gap-2">
              <span>↓ {stats.inboundEmails}</span>
              <span>↑ {stats.outboundEmails}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard principale */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Cartelle */}
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Cartelle Email
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-4">
                  {folders.map((folder) => (
                    <Button
                      key={folder.name}
                      variant={selectedFolder === folder.name ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-between h-auto p-3",
                        selectedFolder === folder.name && "bg-muted"
                      )}
                      onClick={() => setSelectedFolder(folder.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={folder.color}>
                          {folder.icon}
                        </span>
                        <span className="font-medium">{folder.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {folder.unread > 0 && (
                          <Badge variant="destructive" className="text-xs px-1">
                            {folder.unread}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs px-1">
                          {folder.count}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Area Principale */}
        <div className="col-span-12 md:col-span-9">
          <Tabs value="emails" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="emails">Email in {selectedFolder}</TabsTrigger>
              <TabsTrigger value="details">Dettagli Email</TabsTrigger>
            </TabsList>

            <TabsContent value="emails" className="space-y-4">
              <div className="rounded-lg border border-border">
                <div className="flex flex-col space-y-1.5 p-6">
                  <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-between">
                    <span>Email in cartella: {selectedFolder}</span>
                    <Badge variant="outline">
                      {emails.length} messaggi
                    </Badge>
                  </h3>
                </div>
                <div className="p-0" style={{ backgroundColor: 'hsl(240 10% 3.9%)' }}>
                  <ScrollArea className="h-[500px] !bg-[hsl(240_10%_3.9%)]" style={{ backgroundColor: 'hsl(240 10% 3.9%)' }}>
                    {loading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Caricamento email...
                      </div>
                    ) : emails.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Nessuna email in questa cartella
                      </div>
                    ) : (
                      <div className="divide-y divide-border" style={{ backgroundColor: 'hsl(240 10% 3.9%)' }}>
                        {emails.map((email) => (
                          <div
                            key={email.id}
                            style={{ backgroundColor: 'hsl(240 10% 3.9%) !important' }}
                            className={cn(
                              "p-4 cursor-pointer transition-colors relative !bg-[hsl(240_10%_3.9%)]",
                              "hover:border-l-2 hover:border-primary",
                              selectedEmail?.id === email.id && "border-l-4 border-primary"
                            )}
                            onClick={() => setSelectedEmail(email)}
                          >
                            <div className="flex items-start justify-between gap-4 pb-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(email.stato)}
                                  <span className={cn(
                                    "font-medium truncate",
                                    email.stato === 'nuovo' && "font-bold"
                                  )}>
                                    {email.from_email}
                                  </span>
                                  <Badge 
                                    variant={email.direzione === 'inbound' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {email.direzione === 'inbound' ? '↓' : '↑'}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium text-foreground mb-1 truncate">
                                  {email.subject || 'Nessun oggetto'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {email.body_text?.substring(0, 100) || 'Nessun contenuto'}...
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground flex-shrink-0">
                                {formatDate(email.data_ricezione)}
                              </div>
                            </div>
                            {/* Indicatore email non letta - icona rossa in basso a destra */}
                            {email.stato === 'nuovo' && (
                              <div className="absolute bottom-2 right-2">
                                <Mail className="h-4 w-4 text-red-600 fill-red-600" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dettagli Email</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedEmail ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Da:</label>
                          <p className="text-sm text-muted-foreground">{selectedEmail.from_email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">A:</label>
                          <p className="text-sm text-muted-foreground">{selectedEmail.to_email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Data:</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedEmail.data_ricezione).toLocaleString('it-IT')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Stato:</label>
                          <Badge variant="outline">{selectedEmail.stato}</Badge>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <label className="text-sm font-medium">Oggetto:</label>
                        <p className="text-sm mt-1">{selectedEmail.subject || 'Nessun oggetto'}</p>
                      </div>
                      <Separator />
                      <div>
                        <label className="text-sm font-medium">Contenuto:</label>
                        <ScrollArea className="h-64 w-full border rounded-md p-4 mt-2">
                          <div 
                            className="text-sm whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: selectedEmail.body_html || selectedEmail.body_text || 'Nessun contenuto'
                            }}
                          />
                        </ScrollArea>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Seleziona un'email per visualizzarne i dettagli
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};