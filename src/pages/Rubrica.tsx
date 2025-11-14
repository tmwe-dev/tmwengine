import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Phone, Mail, Building, MapPin, Tag, Edit, Trash2, FileText, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContactForm } from '@/components/rubrica/ContactForm';
import { ContactFilters } from '@/components/rubrica/ContactFilters';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityIndicators } from '@/components/ui/activity-indicators';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { useUserActivities } from '@/hooks/useUserActivities';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { Brain } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmailQueueBadge } from '@/components/email-campagne/EmailQueueBadge';

interface Contact {
  id: string;
  nome: string;
  azienda?: string;
  email?: string;
  telefono?: string;
  cellulare?: string;
  indirizzo?: string;
  zip_code?: string;
  citta?: string;
  paese?: string;
  note?: string;
  tags?: string[];
  responsabile?: string;
  alias?: string;
  position?: string;
  title?: string;
  created_at: string;
}

export default function Rubrica() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tag: '',
    citta: '',
    nazione: '',
    hasActivities: false,
    hasNotes: false,
    myContactsWithActivities: false
  });

  const { toast } = useToast();
  const { getCompanyActivities, refreshActivities, getActivityCount } = useCompanyActivities();
  const { hasUserActivitiesForContact } = useUserActivities();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const openAIChat = () => {
    navigate('/chat?page=/rubrica');
  };

  // Carica i contatti dal database
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rubrica')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Errore",
          description: "Errore nel caricamento dei contatti",
          variant: "destructive"
        });
        console.error('Error loading contacts:', error);
        return;
      }

      setContacts(data || []);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei contatti",
        variant: "destructive"
      });
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchableText = `${contact.nome || ''} ${contact.responsabile || ''} ${contact.azienda || ''} ${contact.email || ''}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());

    // Filtro per clienti con attività dell'agente
    const matchesMyContactsActivities = !filters.myContactsWithActivities || 
      hasUserActivitiesForContact(contact.id);

    const matchesFilters = 
      (!filters.tag || contact.tags?.includes(filters.tag)) &&
      (!filters.citta || contact.citta?.toLowerCase().includes(filters.citta.toLowerCase())) &&
      (!filters.nazione || contact.paese?.toLowerCase().includes(filters.nazione.toLowerCase())) &&
      (!filters.hasActivities || getActivityCount(contact.id) > 0) &&
      (!filters.hasNotes || (contact.note && contact.note.trim() !== ''));

    return matchesSearch && matchesMyContactsActivities && matchesFilters;
  });

  const handleAddContact = async (formData: { responsabile: string; azienda?: string; email?: string; telefono?: string; indirizzo?: string; cap?: string; citta?: string; provincia_stato?: string; nazione?: string; note?: string; tag?: string[]; }) => {
    const contactData: Omit<Contact, 'id' | 'created_at'> = {
      nome: formData.responsabile,
      azienda: formData.azienda,
      email: formData.email,
      telefono: formData.telefono,
      indirizzo: formData.indirizzo,
      zip_code: formData.cap,
      citta: formData.citta,
      paese: formData.nazione,
      note: formData.note,
      tags: formData.tag,
      responsabile: formData.responsabile
    };
    try {
      const { data, error } = await supabase
        .from('rubrica')
        .insert([contactData])
        .select()
        .single();

      if (error) {
        toast({
          title: "Errore",
          description: "Errore nell'aggiunta del contatto",
          variant: "destructive"
        });
        console.error('Error adding contact:', error);
        return;
      }

      setContacts(prev => [data, ...prev]);
      setIsFormOpen(false);
      toast({
        title: "Successo",
        description: "Contatto aggiunto con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'aggiunta del contatto",
        variant: "destructive"
      });
      console.error('Error adding contact:', error);
    }
  };

  const handleEditContact = async (formData: { responsabile: string; azienda?: string; email?: string; telefono?: string; indirizzo?: string; cap?: string; citta?: string; provincia_stato?: string; nazione?: string; note?: string; tag?: string[]; }) => {
    if (!selectedContact) return;
    
    const contactData: Omit<Contact, 'id' | 'created_at'> = {
      nome: formData.responsabile,
      azienda: formData.azienda,
      email: formData.email,
      telefono: formData.telefono,
      indirizzo: formData.indirizzo,
      zip_code: formData.cap,
      citta: formData.citta,
      paese: formData.nazione,
      note: formData.note,
      tags: formData.tag,
      responsabile: formData.responsabile
    };

    try {
      const { data, error } = await supabase
        .from('rubrica')
        .update(contactData)
        .eq('id', selectedContact.id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Errore",
          description: "Errore nella modifica del contatto",
          variant: "destructive"
        });
        console.error('Error updating contact:', error);
        return;
      }

      setContacts(prev => prev.map(contact => 
        contact.id === selectedContact.id ? data : contact
      ));
      setSelectedContact(null);
      setIsFormOpen(false);
      toast({
        title: "Successo",
        description: "Contatto modificato con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nella modifica del contatto",
        variant: "destructive"
      });
      console.error('Error updating contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      // Prima elimina le attività associate
      const { error: activitiesError } = await supabase
        .from('attivita')
        .delete()
        .eq('rubrica_id', contactId);

      if (activitiesError) {
        console.error('Error deleting activities:', activitiesError);
        // Continua comunque con l'eliminazione del contatto
      }

      // Poi elimina il contatto
      const { error } = await supabase
        .from('rubrica')
        .delete()
        .eq('id', contactId);

      if (error) {
        toast({
          title: "Errore",
          description: "Errore nell'eliminazione del contatto",
          variant: "destructive"
        });
        console.error('Error deleting contact:', error);
        return;
      }

      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      await refreshActivities();
      toast({
        title: "Successo",
        description: "Contatto e attività associate eliminati con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione del contatto",
        variant: "destructive"
      });
      console.error('Error deleting contact:', error);
    }
  };

  const openEditForm = (contact: Contact) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setSelectedContact(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Title and Toggle */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clienti</h1>
            {isHeaderVisible && (
              <p className="text-muted-foreground animate-accordion-down">
                Gestisci tutti i tuoi clienti della rubrica
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHeaderVisible(!isHeaderVisible)}
            className="h-8 w-8 shrink-0 mt-2.5"
          >
            {isHeaderVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Action Buttons and Filters */}
        {isHeaderVisible && (
          <div className="overflow-hidden animate-accordion-down space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <EmailQueueBadge />
                
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openAddForm} size="icon" className="shadow-soft">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedContact ? 'Modifica Cliente' : 'Nuovo Cliente'}
                      </DialogTitle>
                    </DialogHeader>
                    <ContactForm
                      contact={selectedContact ? {
                        ...selectedContact, 
                        data_creazione: selectedContact.created_at,
                        tag: selectedContact.tags || [],
                        responsabile: selectedContact.responsabile || selectedContact.nome || '',
                        nazione: selectedContact.paese,
                        provincia_stato: '',
                        cap: selectedContact.zip_code
                      } : null}
                      onSubmit={selectedContact ? handleEditContact : handleAddContact}
                      onCancel={() => setIsFormOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <Search className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cerca in CRM..." 
                        className="pl-10"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <Filter className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Filtri Avanzati</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <ContactFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        onClose={() => setIsFiltersOpen(false)}
                      />
                      <div className="flex items-center space-x-2 pt-4 border-t">
                        <input
                          type="checkbox"
                          id="hasActivities"
                          checked={filters.hasActivities}
                          onChange={(e) => setFilters({...filters, hasActivities: e.target.checked})}
                          className="h-4 w-4"
                        />
                        <label htmlFor="hasActivities" className="text-sm font-medium">
                          Solo contatti con attività associate
                        </label>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex items-center gap-1">
                <UnifiedAICommunicationBadge pageRoute="/rubrica" />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={openAIChat}
                  className="h-8 w-8"
                >
                  <Brain className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Card */}
            <Card className="border-card shadow-soft bg-card-transparent">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome, azienda o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Stats */}
      <div className="flex gap-4 overflow-x-auto">
        <Card className="border-card shadow-soft bg-card-transparent">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {contacts.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Contatti Totali
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-card shadow-soft bg-card-transparent">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {filteredContacts.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Risultati Filtro
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card shadow-soft bg-card-transparent">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {contacts.filter(c => c.azienda).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Con Azienda
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.length === 0 ? (
          <Card className="col-span-full border-card shadow-soft bg-card-transparent">
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground mb-4">
                {contacts.length === 0 ? (
                  <>
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessun cliente</h3>
                    <p className="text-body mb-4">
                      Inizia aggiungendo il tuo primo cliente alla rubrica
                    </p>
                    <Button onClick={openAddForm}>
                      <Plus className="h-4 w-4" />
                      Aggiungi Primo Cliente
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessun risultato</h3>
                    <p className="text-body">
                      Prova a modificare i termini di ricerca o i filtri
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact, index) => (
            <Card key={contact.id} className="border-card shadow-soft hover:shadow-medium transition-shadow bg-card-transparent">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{index + 1}
                      </span>
                      {contact.note && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <FileText 
                                className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700" 
                                onClick={() => toast({
                                  title: "Note",
                                  description: contact.note
                                })}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Clicca per vedere le note</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {contact.nome || contact.responsabile}
                      </CardTitle>
                    </div>
                     {contact.azienda && (
                       <div className="flex items-center gap-2 mt-1">
                         <Building className="h-4 w-4" />
                         <span className="text-sm text-muted-foreground">{contact.azienda}</span>
                         <ActivityIndicators 
                           companyId={contact.id} 
                           activities={getCompanyActivities(contact.id)}
                           size="sm"
                         />
                       </div>
                     )}
                  </div>
                  <div className="flex gap-2">
                    {getActivityCount(contact.id) > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate('/attivita', { state: { filterByContact: contact.id } })}
                              className="h-8 w-8"
                            >
                              <Activity className="h-4 w-4 text-primary" />
                              <span className="ml-1 text-xs">{getActivityCount(contact.id)}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizza {getActivityCount(contact.id)} attività</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditForm(contact)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteContact(contact.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                
                {contact.telefono && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{contact.telefono}</span>
                  </div>
                )}
                
                {(contact.citta || contact.paese) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[contact.citta, contact.paese]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {contact.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contact.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {contact.note && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {contact.note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      )}
    </div>
    </>
  );
}