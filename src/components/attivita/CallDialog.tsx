import React, { useState, useEffect, useRef } from 'react';
import { Phone, MessageCircle, X, Edit, Save, Smartphone, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePhoneActions } from '@/hooks/usePhoneActions';

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id?: string;
    nome?: string;
    azienda?: string;
    telefono?: string;
    cellulare?: string;
  } | null;
  onSave?: (contactId: string, telefono: string, cellulare: string) => void;
}

export function CallDialog({ isOpen, onClose, contact, onSave }: CallDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [cellulare, setCellulare] = useState('');
  const [focusField, setFocusField] = useState<'telefono' | 'cellulare' | null>(null);
  
  const telefonoRef = useRef<HTMLInputElement>(null);
  const cellulareRef = useRef<HTMLInputElement>(null);
  
  // Usa il nuovo hook per le azioni telefono/WhatsApp
  const { 
    makePhoneCall, 
    sendWhatsAppMessage, 
    validateAndFormatNumber, 
    formatForDisplay,
    isWhatsAppAvailable,
    config 
  } = usePhoneActions();

  useEffect(() => {
    if (contact) {
      setTelefono(contact.telefono || '');
      setCellulare(contact.cellulare || '');
    }
  }, [contact]);

  // Focus automatico quando entra in modalità editing
  useEffect(() => {
    if (isEditing && focusField) {
      const timeoutId = setTimeout(() => {
        if (focusField === 'telefono' && telefonoRef.current) {
          telefonoRef.current.focus();
        } else if (focusField === 'cellulare' && cellulareRef.current) {
          cellulareRef.current.focus();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isEditing, focusField]);

  if (!contact) return null;

  // Gestisce chiamata telefonica con validazione avanzata
  const handlePhoneCall = (phoneNumber: string) => {
    makePhoneCall(phoneNumber);
  };

  // Gestisce messaggio WhatsApp con validazione avanzata
  const handleWhatsApp = (phoneNumber: string) => {
    sendWhatsAppMessage(phoneNumber);
  };

  const handleSave = () => {
    if (onSave && contact.id) {
      onSave(contact.id, telefono, cellulare);
      setIsEditing(false);
      setFocusField(null);
    }
  };

  const handleFieldClick = (field: 'telefono' | 'cellulare') => {
    if (!isEditing) {
      setFocusField(field);
      setIsEditing(true);
    }
  };

  // Valida e mostra stato del numero in tempo reale
  const getNumberValidation = (number: string) => {
    if (!number) return null;
    return validateAndFormatNumber(number);
  };

  const phoneNumbers = [
    { label: 'Telefono', number: isEditing ? telefono : contact.telefono },
    { label: 'Cellulare', number: isEditing ? cellulare : contact.cellulare }
  ]; // Rimuovo il filter per mostrare sempre entrambi i campi

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="text-sm">Attività</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-medium">Contatta</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Titolo */}
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-xl">Contatta {contact.nome || 'Contatto'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informazioni contatto */}
          <div className="bg-muted/20 p-4 rounded-lg">
            <div className="font-medium text-text-primary">
              {contact.nome || 'Nessun nome'}
            </div>
            {contact.azienda && (
              <div className="text-sm text-text-secondary">
                {contact.azienda}
              </div>
            )}
          </div>

          {/* Campo Telefono */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                <Phone className="h-4 w-4 text-primary" />
              </div>
               <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Telefono</Label>
                  {!isEditing && contact.telefono && (
                    <div className="flex items-center gap-1">
                      {getNumberValidation(contact.telefono)?.isValid ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {getNumberValidation(contact.telefono)?.type || 'sconosciuto'}
                      </span>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      ref={telefonoRef}
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder={`es. ${config.defaultCountryCode} 123 456 7890`}
                      className="mt-1"
                    />
                    {telefono && (
                      <div className="flex items-center gap-1 text-xs">
                        {getNumberValidation(telefono)?.isValid ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={getNumberValidation(telefono)?.isValid ? 'text-green-600' : 'text-red-600'}>
                          {getNumberValidation(telefono)?.isValid ? 'Numero valido' : 'Numero non valido'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="mt-1 p-2 bg-muted/20 rounded border cursor-pointer hover:bg-muted/30 transition-colors min-h-[40px] flex items-center"
                    onClick={() => handleFieldClick('telefono')}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleFieldClick('telefono');
                      }
                    }}
                  >
                    <span className="font-mono text-sm">
                      {contact.telefono ? formatForDisplay(contact.telefono) : 'Clicca per aggiungere'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePhoneCall(contact.telefono || '')}
                  disabled={!contact.telefono || !getNumberValidation(contact.telefono)?.isValid}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Chiama
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleWhatsApp(contact.telefono || '')}
                  disabled={!contact.telefono || !isWhatsAppAvailable(contact.telefono || '')}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            )}
          </div>

          {/* Campo Cellulare */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Cellulare</Label>
                  {!isEditing && contact.cellulare && (
                    <div className="flex items-center gap-1">
                      {getNumberValidation(contact.cellulare)?.isValid ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {getNumberValidation(contact.cellulare)?.type || 'sconosciuto'}
                      </span>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      ref={cellulareRef}
                      type="tel"
                      value={cellulare}
                      onChange={(e) => setCellulare(e.target.value)}
                      placeholder={`es. ${config.defaultCountryCode} 333 456 7890`}
                      className="mt-1"
                    />
                    {cellulare && (
                      <div className="flex items-center gap-1 text-xs">
                        {getNumberValidation(cellulare)?.isValid ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={getNumberValidation(cellulare)?.isValid ? 'text-green-600' : 'text-red-600'}>
                          {getNumberValidation(cellulare)?.isValid ? 'Numero valido' : 'Numero non valido'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="mt-1 p-2 bg-muted/20 rounded border cursor-pointer hover:bg-muted/30 transition-colors min-h-[40px] flex items-center"
                    onClick={() => handleFieldClick('cellulare')}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleFieldClick('cellulare');
                      }
                    }}
                  >
                    <span className="font-mono text-sm">
                      {contact.cellulare ? formatForDisplay(contact.cellulare) : 'Clicca per aggiungere'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePhoneCall(contact.cellulare || '')}
                  disabled={!contact.cellulare || !getNumberValidation(contact.cellulare)?.isValid}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Chiama
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleWhatsApp(contact.cellulare || '')}
                  disabled={!contact.cellulare || !isWhatsAppAvailable(contact.cellulare || '')}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            )}
          </div>

          {/* Pulsanti di azione */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              {isEditing && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Salva
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setFocusField(null);
                      setTelefono(contact.telefono || '');
                      setCellulare(contact.cellulare || '');
                    }}
                  >
                    Annulla
                  </Button>
                </>
              )}
            </div>
            
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Chiudi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}