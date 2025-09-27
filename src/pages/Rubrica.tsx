import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Phone, Mail, Building, MapPin, Tag, Edit, Trash2, FileText } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tag: '',
    citta: '',
    nazione: ''
  });
  
  const { toast } = useToast();
  const { getCompanyActivities, refreshActivities } = useCompanyActivities();

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

    const matchesFilters = 
      (!filters.tag || contact.tags?.includes(filters.tag)) &&
      (!filters.citta || contact.citta?.toLowerCase().includes(filters.citta.toLowerCase())) &&
      (!filters.nazione || contact.paese?.toLowerCase().includes(filters.nazione.toLowerCase()));

    return matchesSearch && matchesFilters;
  });

  const handleAddContact = async (contactData: Omit<Contact, 'id' | 'created_at'>) => {
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

  const handleEditContact = async (contactData: Omit<Contact, 'id' | 'created_at'>) => {
    if (!selectedContact) return;

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
      toast({
        title: "Successo",
        description: "Contatto eliminato con successo"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">Rubrica</h1>
          <p className="text-body text-text-secondary">
            Gestisci tutti i tuoi contatti e clienti
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddForm} className="shadow-soft">
              <Plus className="h-4 w-4" />
              Nuovo Contatto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedContact ? 'Modifica Contatto' : 'Nuovo Contatto'}
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
      </div>

      {/* Search and Filters */}
      <Card className="border-card shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Cerca per nome, azienda o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="shadow-soft">
                  <Filter className="h-4 w-4" />
                  Filtri
                  {(filters.tag || filters.citta || filters.nazione) && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(filters).filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filtri Avanzati</DialogTitle>
                </DialogHeader>
                <ContactFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClose={() => setIsFiltersOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-card shadow-soft">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-heading-2 font-bold text-text-primary">
                {contacts.length}
              </div>
              <div className="text-small text-text-secondary">
                Contatti Totali
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-card shadow-soft">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-heading-2 font-bold text-text-primary">
                {filteredContacts.length}
              </div>
              <div className="text-small text-text-secondary">
                Risultati Filtro
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card shadow-soft">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-heading-2 font-bold text-text-primary">
                {contacts.filter(c => c.azienda).length}
              </div>
              <div className="text-small text-text-secondary">
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
          <Card className="col-span-full border-card shadow-soft">
            <CardContent className="p-12 text-center">
              <div className="text-text-secondary mb-4">
                {contacts.length === 0 ? (
                  <>
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessun contatto</h3>
                    <p className="text-body mb-4">
                      Inizia aggiungendo il tuo primo contatto alla rubrica
                    </p>
                    <Button onClick={openAddForm}>
                      <Plus className="h-4 w-4" />
                      Aggiungi Primo Contatto
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
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="border-card shadow-soft hover:shadow-medium transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
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
                      <CardTitle className="text-heading-4 font-semibold text-text-primary">
                        {contact.nome || contact.responsabile}
                      </CardTitle>
                    </div>
                     {contact.azienda && (
                       <div className="flex items-center gap-2 mt-1">
                         <Building className="h-4 w-4" />
                         <span className="text-body text-text-secondary">{contact.azienda}</span>
                         <ActivityIndicators 
                           companyId={contact.id} 
                           activities={getCompanyActivities(contact.id)}
                           size="sm"
                         />
                       </div>
                     )}
                  </div>
                  <div className="flex gap-2">
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
                  <div className="flex items-center gap-2 text-body text-text-secondary">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                
                {contact.telefono && (
                  <div className="flex items-center gap-2 text-body text-text-secondary">
                    <Phone className="h-4 w-4" />
                    <span>{contact.telefono}</span>
                  </div>
                )}
                
                {(contact.citta || contact.paese) && (
                  <div className="flex items-center gap-2 text-body text-text-secondary">
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
                    <Tag className="h-4 w-4 text-text-secondary" />
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
                  <p className="text-small text-text-secondary line-clamp-2">
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
  );
}