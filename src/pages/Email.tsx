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
import { Mail, Send, Inbox, Archive, Trash2, Reply, Forward, Star, Tag, Brain, Users, BarChart3, Filter, Search, Plus, RefreshCw, Clock, CheckCircle, AlertCircle, Download, Scissors } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { EmailComposer } from "@/components/email/EmailComposer";
import { EmailFilters } from "@/components/email/EmailFilters";
import { AIClassificationPanel } from "@/components/email/AIClassificationPanel";
import { EmailImportAnimation } from "@/components/email/EmailImportAnimation";
import { BackgroundRemovalProcessor } from "@/components/email/BackgroundRemovalProcessor";
import { EmailFolderDashboard } from "@/components/email/EmailFolderDashboard";
import { useEmailImport } from "@/hooks/useEmailImport";
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
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showBackgroundRemovalDialog, setShowBackgroundRemovalDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    unread: 0,
    replied: 0,
    archived: 0,
    avgResponseTime: '2h 30m',
    aiClassified: 0
  });
  
  // Hook per gestire l'importazione email
  const emailImport = useEmailImport();

  // Recupera email reali dal database
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      console.log('=== INIZIO FETCH EMAILS ===');
      const { data: emailData, error } = await supabase
        .from('email_messages')
        .select('*')
        .order('data_ricezione', { ascending: false });

      console.log('Query risultato - Error:', error, 'Data:', emailData);

      if (error) {
        console.error('ERRORE nella query:', error);
        setLoading(false);
        toast({
          title: "Errore",
          description: `Errore nel recupero delle email: ${error.message}`,
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
      
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestione Email</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestisci le email con classificazione AI automatica ({emails.length} email dal DB)
          </p>
        </div>
        
        {/* Mobile Actions - Stack vertically on mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button 
            onClick={() => setShowAIPanel(true)} 
            variant="outline" 
            className="w-full sm:w-auto justify-center"
          >
            <Brain className="mr-2 h-4 w-4" />
            AI Panel
          </Button>
          <Button 
            onClick={() => setShowFilters(!showFilters)} 
            variant="outline"
            className="w-full sm:w-auto justify-center"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
          <Button 
            onClick={fetchEmails} 
            variant="outline"
            className="w-full sm:w-auto justify-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Ricarica
          </Button>
          <Button 
            onClick={() => setShowComposer(true)}
            className="w-full sm:w-auto justify-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuova Email
          </Button>
          <Button 
            onClick={() => setShowImporter(true)}
            variant="secondary"
            className="w-full sm:w-auto justify-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Importa Email
          </Button>
          <Button 
            onClick={() => setShowBackgroundRemovalDialog(true)}
            variant="outline"
            className="w-full sm:w-auto justify-center"
          >
            <Scissors className="mr-2 h-4 w-4" />
            Background Removal
          </Button>
        </div>
      </div>

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
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base md:text-lg">Email</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
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
                {filteredEmails.map((email) => (
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
                        
                        <h4 className={`text-xs md:text-sm truncate mb-1 ${email.status === 'unread' ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {email.body}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(email.date).toLocaleDateString('it-IT')}
                          </span>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmailAction(email.id, email.status === 'read' ? 'mark-unread' : 'mark-read');
                              }}
                            >
                              {email.status === 'read' ? '●' : '○'}
                            </Button>
                            
                            {!email.aiClassification && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAIClassification(email.id);
                                }}
                              >
                                <Brain className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Email Detail - Mobile Optimized */}
        <div className="lg:mt-0">
          {selectedEmail ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base md:text-lg">Dettagli Email</CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Reply className="h-4 w-4 mr-1 sm:mr-0" />
                      <span className="sm:hidden">Rispondi</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Forward className="h-4 w-4 mr-1 sm:mr-0" />
                      <span className="sm:hidden">Inoltra</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                          <Trash2 className="h-4 w-4 mr-1 sm:mr-0" />
                          <span className="sm:hidden">Elimina</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare email?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {}}>
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2 flex-wrap">
                    <Badge variant={getPriorityColor(selectedEmail.priority)}>
                      {selectedEmail.priority}
                    </Badge>
                    <Badge variant="outline">
                      {selectedEmail.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-sm md:text-base">{selectedEmail.subject}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground break-all">
                    Da: {selectedEmail.from}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground break-all">
                    A: {selectedEmail.to}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {new Date(selectedEmail.date).toLocaleString('it-IT')}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{selectedEmail.body}</p>
                </div>

                {selectedEmail.aiClassification && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center">
                        <Brain className="w-4 h-4 mr-2" />
                        Classificazione AI
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Intento:</span> {selectedEmail.aiClassification.intent}
                        </div>
                        <div>
                          <span className="font-medium">Categoria:</span> {selectedEmail.aiClassification.category}
                        </div>
                        <div>
                          <span className="font-medium">Confidenza:</span> {(selectedEmail.aiClassification.confidence * 100).toFixed(1)}%
                        </div>
                        
                        <div>
                          <span className="font-medium">Azioni suggerite:</span>
                          <ul className="list-disc list-inside mt-1 text-xs">
                            {selectedEmail.aiClassification.suggestedActions.map((action, index) => (
                              <li key={index}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Seleziona un'email</h3>
                  <p className="text-muted-foreground">
                    Clicca su un'email per visualizzarne i dettagli
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showComposer} onOpenChange={setShowComposer}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nuova Email</DialogTitle>
          </DialogHeader>
          <EmailComposer onClose={() => setShowComposer(false)} />
        </DialogContent>
      </Dialog>

      {/* Background Removal Dialog */}
      <Dialog open={showBackgroundRemovalDialog} onOpenChange={setShowBackgroundRemovalDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Background Removal Processor</DialogTitle>
            <DialogDescription>
              Remove backgrounds from images automatically using AI
            </DialogDescription>
          </DialogHeader>
          <BackgroundRemovalProcessor />
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

      {/* Email Import Dialog */}
      <Dialog open={showImporter} onOpenChange={setShowImporter}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Email Import Manager</DialogTitle>
          </DialogHeader>
          <EmailImportAnimation
            isImporting={emailImport.status.isImporting}
            totalEmails={emailImport.status.totalEmails}
            importedEmails={emailImport.status.importedEmails}
            sourceFolder={emailImport.status.sourceFolder}
            destinationFolder={emailImport.status.destinationFolder}
            estimatedTimeMs={emailImport.status.estimatedTimeMs}
            startTime={emailImport.status.startTime}
            onStartImport={() => {
              emailImport.startImport('INBOX').then(() => {
                // Ricarica le email dopo l'importazione
                fetchEmails();
              }).catch(console.error);
            }}
            onCancelImport={emailImport.cancelImport}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Email;