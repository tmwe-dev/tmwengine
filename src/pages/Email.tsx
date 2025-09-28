import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Send, Inbox, Archive, Trash2, Reply, Forward, Star, Tag, Brain, Users, BarChart3, Filter, Search, Plus, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { EmailComposer } from "@/components/email/EmailComposer";
import { EmailFilters } from "@/components/email/EmailFilters";
import { AIClassificationPanel } from "@/components/email/AIClassificationPanel";

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
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
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

  // Mock data per demo
  useEffect(() => {
    const mockEmails: Email[] = [
      {
        id: '1',
        from: 'cliente@esempio.com',
        to: 'info@azienda.com',
        subject: 'Richiesta informazioni prodotto',
        body: 'Buongiorno, vorrei ricevere maggiori informazioni sui vostri prodotti per ufficio...',
        date: '2024-01-15T10:30:00Z',
        status: 'unread',
        priority: 'high',
        category: 'vendite',
        aiClassification: {
          intent: 'richiesta_informazioni',
          priority: 'high',
          category: 'vendite',
          suggestedActions: ['Invia catalogo prodotti', 'Programma chiamata'],
          confidence: 0.92
        },
        contactId: '1'
      },
      {
        id: '2',
        from: 'supporto@fornitore.com',
        to: 'acquisti@azienda.com',
        subject: 'Aggiornamento ordine #12345',
        body: 'Il vostro ordine è stato spedito e arriverà entro domani...',
        date: '2024-01-15T09:15:00Z',
        status: 'read',
        priority: 'medium',
        category: 'ordini',
        aiClassification: {
          intent: 'aggiornamento_stato',
          priority: 'medium',
          category: 'ordini',
          suggestedActions: ['Aggiorna sistema CRM', 'Notifica team'],
          confidence: 0.89
        }
      },
      {
        id: '3',
        from: 'hr@partner.com',
        to: 'admin@azienda.com',
        subject: 'Proposta collaborazione',
        body: 'Siamo interessati a una partnership strategica...',
        date: '2024-01-14T16:45:00Z',
        status: 'replied',
        priority: 'low',
        category: 'partnership',
        aiClassification: {
          intent: 'proposta_business',
          priority: 'low',
          category: 'partnership',
          suggestedActions: ['Inoltra al management', 'Richiedi presentazione'],
          confidence: 0.85
        }
      }
    ];

    setEmails(mockEmails);
    setStats({
      total: mockEmails.length,
      unread: mockEmails.filter(e => e.status === 'unread').length,
      replied: mockEmails.filter(e => e.status === 'replied').length,
      archived: mockEmails.filter(e => e.status === 'archived').length,
      avgResponseTime: '2h 30m',
      aiClassified: mockEmails.filter(e => e.aiClassification).length
    });
  }, []);

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
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Email</h1>
          <p className="text-muted-foreground">
            Gestisci le email con classificazione AI automatica
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowAIPanel(true)} variant="outline">
            <Brain className="mr-2 h-4 w-4" />
            AI Panel
          </Button>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtri
          </Button>
          <Button onClick={() => setShowComposer(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Email
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totali</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Email totali</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non Lette</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Da processare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Risposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">Tempo medio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Classificate</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiClassified}</div>
            <p className="text-xs text-muted-foreground">Automaticamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && <EmailFilters />}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Email List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CardTitle>Email</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search and Filters */}
              <div className="flex space-x-2">
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
                  <SelectTrigger className="w-32">
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
              <ScrollArea className="h-96">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
                      selectedEmail?.id === email.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(email.status)}
                          <span className={`font-medium truncate ${email.status === 'unread' ? 'font-bold' : ''}`}>
                            {email.from}
                          </span>
                          <Badge variant={getPriorityColor(email.priority)} className="text-xs">
                            {email.priority}
                          </Badge>
                          {email.aiClassification && (
                            <Badge variant="outline" className="text-xs">
                              <Brain className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className={`text-sm truncate ${email.status === 'unread' ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {email.body}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(email.date).toLocaleDateString('it-IT')}
                          </span>
                          
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmailAction(email.id, email.status === 'read' ? 'mark-unread' : 'mark-read');
                              }}
                            >
                              {email.status === 'read' ? 'Non letta' : 'Segna letta'}
                            </Button>
                            
                            {!email.aiClassification && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAIClassification(email.id);
                                }}
                              >
                                <Brain className="h-4 w-4" />
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

        {/* Email Detail */}
        <div>
          {selectedEmail ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Dettagli Email</CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm">
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Forward className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
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
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={getPriorityColor(selectedEmail.priority)}>
                      {selectedEmail.priority}
                    </Badge>
                    <Badge variant="outline">
                      {selectedEmail.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold">{selectedEmail.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    Da: {selectedEmail.from}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A: {selectedEmail.to}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedEmail.date).toLocaleString('it-IT')}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm whitespace-pre-wrap">{selectedEmail.body}</p>
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