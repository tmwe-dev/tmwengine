import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, X, Edit, Save, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  useEffect(() => {
    if (contact) {
      setTelefono(contact.telefono || '');
      setCellulare(contact.cellulare || '');
    }
  }, [contact]);

  if (!contact) return null;

  const handlePhoneCall = (phoneNumber: string) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      window.open(`tel:${cleanNumber}`, '_self');
    }
  };

  const handleWhatsApp = (phoneNumber: string) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      // Rimuove il + iniziale per WhatsApp se presente
      const whatsappNumber = cleanNumber.startsWith('+') ? cleanNumber.substring(1) : cleanNumber;
      window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    }
  };

  const handleSave = () => {
    if (onSave && contact.id) {
      onSave(contact.id, telefono, cellulare);
      setIsEditing(false);
    }
  };

  const handleFieldFocus = () => {
    if (!isEditing) {
      setIsEditing(true); // Attiva direttamente la modalità editing
    }
  };

  const phoneNumbers = [
    { label: 'Telefono', number: isEditing ? telefono : contact.telefono },
    { label: 'Cellulare', number: isEditing ? cellulare : contact.cellulare }
  ]; // Rimuovo il filter per mostrare sempre entrambi i campi

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contatta
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
                <Label className="text-sm font-medium">Telefono</Label>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Inserisci numero di telefono"
                    className="mt-1"
                    onFocus={handleFieldFocus}
                  />
                ) : (
                  <div 
                    className="mt-1 p-2 bg-muted/20 rounded border cursor-pointer hover:bg-muted/30 transition-colors min-h-[40px] flex items-center"
                    onClick={handleFieldFocus}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleFieldFocus();
                      }
                    }}
                  >
                    <span className="font-mono text-sm">
                      {contact.telefono || 'Clicca per aggiungere'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePhoneCall(contact.telefono || '')}
                  disabled={!contact.telefono}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Chiama
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleWhatsApp(contact.telefono || '')}
                  disabled={!contact.telefono}
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
                <Label className="text-sm font-medium">Cellulare</Label>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={cellulare}
                    onChange={(e) => setCellulare(e.target.value)}
                    placeholder="Inserisci numero di cellulare"
                    className="mt-1"
                    onFocus={handleFieldFocus}
                  />
                ) : (
                  <div 
                    className="mt-1 p-2 bg-muted/20 rounded border cursor-pointer hover:bg-muted/30 transition-colors min-h-[40px] flex items-center"
                    onClick={handleFieldFocus}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleFieldFocus();
                      }
                    }}
                  >
                    <span className="font-mono text-sm">
                      {contact.cellulare || 'Clicca per aggiungere'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePhoneCall(contact.cellulare || '')}
                  disabled={!contact.cellulare}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Chiama
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleWhatsApp(contact.cellulare || '')}
                  disabled={!contact.cellulare}
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