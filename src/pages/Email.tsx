import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Inbox, Archive, Trash2, Reply, Forward, Star, Tag, Brain, Users, BarChart3, Filter, Search, Plus, RefreshCw, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { EmailComposer } from "@/components/email/EmailComposer";
import { EmailFilters } from "@/components/email/EmailFilters";
import { AIClassificationPanel } from "@/components/email/AIClassificationPanel";
import { EmailFolderDashboard } from "@/components/email/EmailFolderDashboard";
import { EmailSyncMonitor } from "@/components/email/EmailSyncMonitor";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'medium' | 'high';
  category: string;
  aiClassification?: {
    intent: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    suggestedActions: string[];
    confidence: number;
  };
  contactId?: string;
  campaignId?: string;
}

interface EmailStats {
  total: number;
  unread: number;
  replied: number;
  archived: number;
  avgResponseTime: string;
  aiClassified: number;
}

const Email = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage] = useState(50);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    unread: 0,
    replied: 0,
    archived: 0,
    avgResponseTime: '2h 30m',
    aiClassified: 0
  });

  // Recupera email reali dal database
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      console.log('=== INIZIO FETCH EMAILS ===');
      // CARICAMENTO COMPLETO - NESSUN LIMITE
      let allEmails: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: emailBatch, error } = await supabase
          .from('email_messages')
          .select('*')
          .order('data_ricezione', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('ERRORE nella query batch:', error);
          throw error;
        }

        if (emailBatch && emailBatch.length > 0) {
          allEmails = [...allEmails, ...emailBatch];
          from += batchSize;
          hasMore = emailBatch.length === batchSize;
          console.log(`📥 Caricato batch: ${emailBatch.length} email, totale: ${allEmails.length}`);
        } else {
          hasMore = false;
        }
      }

      console.log(`🎉 CARICAMENTO COMPLETATO: ${allEmails.length} email totali`);
      const emailData = allEmails;

      console.log('Query risultato - EmailData length:', emailData?.length || 0);

      if (!emailData) {
        console.error('NESSUN DATO ricevuto dal database');
        setLoading(false);
        toast({
          title: "Errore",
          description: "Nessun dato ricevuto dal database",
          variant: "destructive"
        });
        return;
      }

      console.log('DATI GREZZI dal DB:', emailData);
      console.log('NUMERO EMAIL TROVATE:', emailData?.length || 0);

      // RESET TOTALE - cancella completamente l'array emails prima di aggiungere i nuovi
      setEmails([]);
      // Conversione FORZATA - nessun dato mock
      const convertedEmails: Email[] = emailData?.map(email => {
        console.log('Convertendo email:', email.subject, 'da:', email.from_email);
        return {
          id: email.id,
          from: email.from_email,
          to: email.to_email,
          subject: email.subject || 'Nessun oggetto',
          body: email.body_text || email.body_html || 'Nessun contenuto',
          date: email.data_ricezione,
          status: email.stato === 'nuovo' ? 'unread' : 
                 email.stato === 'letto' ? 'read' : 
                 email.stato === 'risposto' ? 'replied' : 'archived',
          priority: 'medium' as const,
          category: email.cartella?.toLowerCase() || 'general'
        };
      }) || [];

      console.log('EMAIL CONVERTITE FINALI:', convertedEmails);
      console.log('IMPOSTANDO EMAILS A:', convertedEmails.length, 'elementi');
      
      // FORZATURA: cancella tutto e imposta solo le email dal DB
      setEmails(convertedEmails);
      console.log('=== STATO FINALE ===');
      console.log('EMAILS IMPOSTATE NELLO STATE:', convertedEmails.length);
      console.log('PRIME 5 EMAIL:', convertedEmails.slice(0, 5).map(e => e.subject));
      
      setStats({
        total: convertedEmails.length,
        unread: convertedEmails.filter(e => e.status === 'unread').length,
        replied: convertedEmails.filter(e => e.status === 'replied').length,
        archived: convertedEmails.filter(e => e.status === 'archived').length,
        avgResponseTime: '2h 30m',
        aiClassified: 0
      });

      console.log(`=== COMPLETATO: ${convertedEmails.length} EMAIL DAL DATABASE ===`);
      setLoading(false);
      toast({
        title: "Email caricate",
        description: `${convertedEmails.length} email dal database (NO MOCK)`,
      });
      
    } catch (error) {
      console.error('ERRORE CRITICO nel recupero email:', error);
      setLoading(false);
      toast({
        title: "Errore",
        description: "Errore imprevisto nel recupero delle email",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || email.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || email.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Paginazione
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const endIndex = startIndex + emailsPerPage;
  const currentEmails = filteredEmails.slice(startIndex, endIndex);

  const handleEmailAction = async (emailId: string, action: string) => {
    try {
      const updatedEmails = emails.map(email => {
        if (email.id === emailId) {
          switch (action) {
            case 'mark-read':
              return { ...email, status: 'read' as const };
            case 'mark-unread':
              return { ...email, status: 'unread' as const };
            case 'archive':
              return { ...email, status: 'archived' as const };
            case 'reply':
              return { ...email, status: 'replied' as const };
            default:
              return email;
          }
        }
        return email;
      });

      setEmails(updatedEmails);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        unread: updatedEmails.filter(e => e.status === 'unread').length,
        replied: updatedEmails.filter(e => e.status === 'replied').length,
        archived: updatedEmails.filter(e => e.status === 'archived').length
      }));

      toast({
        title: "Azione completata",
        description: `Email ${action === 'mark-read' ? 'segnata come letta' : action === 'archive' ? 'archiviata' : 'aggiornata'}`,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile completare l'azione",
        variant: "destructive",
      });
    }
  };

  const handleAIClassification = async (emailId: string) => {
    try {
      // Simulazione classificazione AI
      const updatedEmails = emails.map(email => {
        if (email.id === emailId && !email.aiClassification) {
          return {
            ...email,
            aiClassification: {
              intent: 'richiesta_supporto',
              priority: 'medium' as const,
              category: 'supporto',
              suggestedActions: ['Assegna al team supporto', 'Richiedi maggiori dettagli'],
              confidence: 0.87
            }
          };
        }
        return email;
      });

      setEmails(updatedEmails);
      setStats(prev => ({
        ...prev,
        aiClassified: updatedEmails.filter(e => e.aiClassification).length
      }));

      toast({
        title: "Classificazione AI completata",
        description: "Email classificata automaticamente",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile classificare l'email",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Mail className="h-4 w-4" />;
      case 'read': return <CheckCircle className="h-4 w-4" />;
      case 'replied': return <Reply className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-3 md:p-6 touch-pan-y touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
      {loading && (
        <div className="text-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>Caricamento email dal database...</p>
        </div>
      )}
      
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestione Email</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Dashboard completa per la gestione email con cartelle e dati reali
          </p>
        </div>
      </div>
      
      {/* Tabs per diverse visualizzazioni */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        {/* Dropdown mobile per selezione sezione */}
        {isMobile ? (
          <div className="mb-4">
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="w-full h-11 bg-background border-border shadow-sm">
                <SelectValue placeholder="Seleziona sezione" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="dashboard">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard Cartelle</span>
                  </div>
                </SelectItem>
                <SelectItem value="monitor">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>Monitor Sync</span>
                  </div>
                </SelectItem>
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Lista Email</span>
                  </div>
                </SelectItem>
                <SelectItem value="tools">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span>Strumenti</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard Cartelle</TabsTrigger>
            <TabsTrigger value="monitor">Monitor Sync</TabsTrigger>
            <TabsTrigger value="list">Lista Email</TabsTrigger>
            <TabsTrigger value="tools">Strumenti</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="dashboard" className="space-y-4">
          <EmailFolderDashboard />
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <EmailSyncMonitor onSyncComplete={fetchEmails} />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Card className="min-h-[100px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Totali</CardTitle>
                <Mail className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Email totali</p>
              </CardContent>
            </Card>

            <Card className="min-h-[100px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Non Lette</CardTitle>
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">{stats.unread}</div>
                <p className="text-xs text-muted-foreground">Da processare</p>
              </CardContent>
            </Card>

            <Card className="min-h-[100px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">Tempo Risposta</CardTitle>
                <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">{stats.avgResponseTime}</div>
                <p className="text-xs text-muted-foreground">Tempo medio</p>
              </CardContent>
            </Card>

            <Card className="min-h-[100px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">AI Classificate</CardTitle>
                <Brain className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">{stats.aiClassified}</div>
                <p className="text-xs text-muted-foreground">Automaticamente</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          {showFilters && <EmailFilters />}

          {/* Main Content - Mobile Optimized */}
          <div className="space-y-4 lg:space-y-0 lg:grid lg:gap-6 lg:grid-cols-3">
            {/* Email List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-base md:text-lg">Email</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {filteredEmails.length} totali / {currentEmails.length} mostrate
                      </Badge>
                      <Button variant="outline" size="sm" onClick={fetchEmails}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Search and Filters - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="unread">Non lette</SelectItem>
                        <SelectItem value="read">Lette</SelectItem>
                        <SelectItem value="replied">Risposte</SelectItem>
                        <SelectItem value="archived">Archiviate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                
                
                <CardContent className="p-0">
                  <ScrollArea className="h-96 touch-pan-y touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {currentEmails.map((email) => (
                      <div
                        key={email.id}
                        className={`p-2 md:p-4 border-b cursor-pointer hover:bg-muted/50 ${
                          selectedEmail?.id === email.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedEmail(email)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              {getStatusIcon(email.status)}
                              <span className={`font-medium truncate text-xs md:text-sm flex-1 ${email.status === 'unread' ? 'font-bold' : ''}`}>
                                {email.from}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge variant={getPriorityColor(email.priority)} className="text-xs px-1 py-0 h-4 min-w-0">
                                  {email.priority.charAt(0).toUpperCase()}
                                </Badge>
                                {email.aiClassification && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 min-w-0">
                                    <Brain className="w-2 h-2" />
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-xs md:text-sm font-medium mb-1 truncate">
                              {email.subject}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {email.body.substring(0, 60)}...
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(email.date).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>
                      ))}
                    </ScrollArea>
                    
                    {/* Controlli di paginazione */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Precedente
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Pagina {currentPage} di {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Successiva
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mostrando {startIndex + 1}-{Math.min(endIndex, filteredEmails.length)} di {filteredEmails.length} email
                        </div>
                      </div>
                    )}
                  </CardContent>
              </Card>
            </div>

            {/* Email Detail Panel */}
            {selectedEmail ? (
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">Dettagli Email</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">DA</div>
                      <div className="text-xs md:text-sm">{selectedEmail.from}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">A</div>
                      <div className="text-xs md:text-sm">{selectedEmail.to}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">OGGETTO</div>
                      <div className="text-xs md:text-sm font-medium">{selectedEmail.subject}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">DATA</div>
                      <div className="text-xs md:text-sm">
                        {new Date(selectedEmail.date).toLocaleString('it-IT')}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">CONTENUTO</div>
                      <ScrollArea className="h-32 text-xs md:text-sm">
                        {selectedEmail.body}
                      </ScrollArea>
                    </div>
                    
                    {/* AI Classification Display */}
                    {selectedEmail.aiClassification && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            CLASSIFICAZIONE AI
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Intento:</span>
                              <Badge variant="outline" className="text-xs">
                                {selectedEmail.aiClassification.intent}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Priorità:</span>
                              <Badge variant={getPriorityColor(selectedEmail.aiClassification.priority)} className="text-xs">
                                {selectedEmail.aiClassification.priority}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Confidenza:</span>
                              <span>{Math.round(selectedEmail.aiClassification.confidence * 100)}%</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-medium">Azioni suggerite:</div>
                              {selectedEmail.aiClassification.suggestedActions.map((action, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs mr-1 mb-1">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <Separator />
                    <div className="space-y-2">
                      <Button 
                        size="sm" 
                        className="w-full text-xs" 
                        onClick={() => handleEmailAction(selectedEmail.id, 'reply')}
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Rispondi
                      </Button>
                      <div className="grid grid-cols-2 gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleEmailAction(selectedEmail.id, 'mark-read')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Letta
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleEmailAction(selectedEmail.id, 'archive')}
                        >
                          <Archive className="h-3 w-3 mr-1" />
                          Archivia
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={() => handleAIClassification(selectedEmail.id)}
                        disabled={!!selectedEmail.aiClassification}
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        {selectedEmail.aiClassification ? 'Già classificata' : 'Classifica con AI'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">
                        Clicca su un'email per visualizzarne i dettagli
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <p>Strumenti email rimossi</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nuova Email</DialogTitle>
          </DialogHeader>
          <EmailComposer onClose={() => setShowComposer(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showAIPanel} onOpenChange={setShowAIPanel}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pannello Classificazione AI</DialogTitle>
          </DialogHeader>
          <AIClassificationPanel emails={emails} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Email;