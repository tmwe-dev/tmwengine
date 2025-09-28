import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, X, Edit, Save } from 'lucide-react';
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

  const phoneNumbers = [
    { label: 'Telefono', number: isEditing ? telefono : contact.telefono },
    { label: 'Cellulare', number: isEditing ? cellulare : contact.cellulare }
  ];

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

          {/* Pulsanti di azione principale */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={isEditing ? "outline" : "default"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-1" />
              {isEditing ? 'Annulla' : 'Modifica'}
            </Button>
            
            {isEditing && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-1" />
                Salva
              </Button>
            )}
          </div>

          {/* Numeri disponibili */}
          <div className="space-y-3">
            {phoneNumbers.map((item, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{item.label}</Badge>
                  {isEditing ? (
                    <div className="flex-1 ml-3">
                      <Input
                        type="tel"
                        value={item.label === 'Telefono' ? telefono : cellulare}
                        onChange={(e) => 
                          item.label === 'Telefono' 
                            ? setTelefono(e.target.value)
                            : setCellulare(e.target.value)
                        }
                        placeholder={`Inserisci ${item.label.toLowerCase()}`}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <span className="font-mono text-sm">
                      {item.number || 'Non disponibile'}
                    </span>
                  )}
                </div>
                
                {!isEditing && item.number && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePhoneCall(item.number!)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Chiama
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleWhatsApp(item.number!)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                )}
                
                {!isEditing && !item.number && (
                  <div className="text-center py-2 text-text-secondary text-sm">
                    {item.label} non disponibile
                  </div>
                )}
              </div>
            ))}
          </div>

          {phoneNumbers.every(item => !item.number) && !isEditing && (
            <div className="text-center py-8 text-text-secondary">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun numero di telefono disponibile</p>
              <Button 
                variant="outline" 
                className="mt-3"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Aggiungi numeri
              </Button>
            </div>
          )}

          {/* Pulsante chiudi */}
          <div className="flex justify-end pt-4 border-t">
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