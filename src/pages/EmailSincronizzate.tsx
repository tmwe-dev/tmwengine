import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  User,
  Send,
  Inbox,
  Archive,
  AlertCircle
} from 'lucide-react';

const EmailSincronizzate = () => {
  const { toast } = useToast();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroDirezione, setFiltroDirezione] = useState('tutti');
  const [emailSelezionata, setEmailSelezionata] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      console.log('📧 Loading emails from database...');

      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .order('data_ricezione', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error loading emails:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare le email",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Loaded emails:', data?.length || 0);
      setEmails(data || []);
      
      if (data?.length === 0) {
        toast({
          title: "Info",
          description: "Nessuna email sincronizzata. Configura il provider email e sincronizza.",
        });
      }
    } catch (error) {
      console.error('❌ Error in loadEmails:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento delle email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEmails = async () => {
    try {
      // Trova provider attivo
      const { data: providerData } = await supabase
        .from('email_provider')
        .select('id')
        .eq('attivo', true)
        .eq('tipo_provider', 'smtp_imap')
        .single();

      if (!providerData) {
        toast({
          title: "Errore",
          description: "Nessun provider email SMTP/IMAP configurato e attivo",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sincronizzazione",
        description: "Sincronizzazione email in corso...",
      });

      const response = await fetch(`https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/email-imap-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A`
        },
        body: JSON.stringify({
          provider_id: providerData.id,
          tipo_sync: 'manuale'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Successo",
          description: `Sincronizzate ${result.messaggi_nuovi || 0} nuove email`,
        });
        loadEmails(); // Ricarica le email
      } else {
        throw new Error('Errore sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sync:', error);
      toast({
        title: "Errore",
        description: "Impossibile sincronizzare le email",
        variant: "destructive",
      });
    }
  };

  // Filtra le email
  const emailsFiltrate = emails.filter(email => {
    const matchSearch = !searchTerm || 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body_text?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStato = filtroStato === 'tutti' || email.stato === filtroStato;
    const matchDirezione = filtroDirezione === 'tutti' || email.direzione === filtroDirezione;

    return matchSearch && matchStato && matchDirezione;
  });

  const getStatoBadge = (stato) => {
    const variants = {
      'nuovo': 'default',
      'letto': 'secondary',
      'risposto': 'outline',
      'archiviato': 'destructive'
    };
    return variants[stato] || 'default';
  };

  const getDirezioneBadge = (direzione) => {
    return direzione === 'inbound' ? 'default' : 'secondary';
  };

  const formatData = (dataStr) => {
    try {
      const data = new Date(dataStr);
      return data.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Sincronizzate</h1>
            <p className="text-muted-foreground">Caricamento email...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Sincronizzate</h1>
            <p className="text-muted-foreground">
              {emails.length} email sincronizzate dal server IMAP
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtri
          </Button>
          <Button onClick={handleSyncEmails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizza
          </Button>
        </div>
      </div>

      {/* Barra di ricerca e filtri */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per oggetto, mittente o contenuto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {showFilters && (
              <>
                <Select value={filtroStato} onValueChange={setFiltroStato}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="nuovo">Nuovo</SelectItem>
                    <SelectItem value="letto">Letto</SelectItem>
                    <SelectItem value="risposto">Risposto</SelectItem>
                    <SelectItem value="archiviato">Archiviato</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroDirezione} onValueChange={setFiltroDirezione}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Direzione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutte</SelectItem>
                    <SelectItem value="inbound">In entrata</SelectItem>
                    <SelectItem value="outbound">In uscita</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista email */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista email */}
        <div className="lg:col-span-1 space-y-3">
          {emailsFiltrate.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nessuna email trovata</h3>
                <p className="text-muted-foreground mb-4">
                  {emails.length === 0 
                    ? "Nessuna email sincronizzata. Prova a sincronizzare."
                    : "Nessuna email corrisponde ai filtri applicati."
                  }
                </p>
                {emails.length === 0 && (
                  <Button onClick={handleSyncEmails}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizza ora
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            emailsFiltrate.map((email) => (
              <Card 
                key={email.id} 
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  emailSelezionata?.id === email.id ? 'bg-accent' : ''
                }`}
                onClick={() => setEmailSelezionata(email)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {email.direzione === 'inbound' ? 
                          <Inbox className="h-4 w-4 text-blue-500" /> : 
                          <Send className="h-4 w-4 text-green-500" />
                        }
                        <Badge variant={getDirezioneBadge(email.direzione)} className="text-xs">
                          {email.direzione === 'inbound' ? 'Ricevuta' : 'Inviata'}
                        </Badge>
                        <Badge variant={getStatoBadge(email.stato)} className="text-xs">
                          {email.stato}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm truncate">
                        {email.subject || 'Nessun oggetto'}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {email.direzione === 'inbound' ? `Da: ${email.from_email}` : `A: ${email.to_email}`}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {email.body_text || 'Nessun contenuto'}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatData(email.data_ricezione)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dettagli email selezionata */}
        <div className="lg:col-span-2">
          {emailSelezionata ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {emailSelezionata.subject || 'Nessun oggetto'}
                    </CardTitle>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>Da:</strong> {emailSelezionata.from_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>A:</strong> {emailSelezionata.to_email}
                        </span>
                      </div>
                      {emailSelezionata.cc_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>CC:</strong> {emailSelezionata.cc_email}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatData(emailSelezionata.data_ricezione)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getDirezioneBadge(emailSelezionata.direzione)}>
                      {emailSelezionata.direzione === 'inbound' ? 'Ricevuta' : 'Inviata'}
                    </Badge>
                    <Badge variant={getStatoBadge(emailSelezionata.stato)}>
                      {emailSelezionata.stato}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  {emailSelezionata.body_html ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: emailSelezionata.body_html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {emailSelezionata.body_text || 'Nessun contenuto'}
                    </pre>
                  )}
                </div>
                
                {emailSelezionata.attachments && emailSelezionata.attachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Allegati:</h4>
                    <div className="space-y-1">
                      {emailSelezionata.attachments.map((attachment, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          📎 {attachment.filename || `Allegato ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Seleziona un'email</h3>
                <p className="text-muted-foreground">
                  Scegli un'email dalla lista per visualizzarne i dettagli
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSincronizzate;