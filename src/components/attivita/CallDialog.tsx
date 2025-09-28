import React from 'react';
import { Phone, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    nome?: string;
    azienda?: string;
    telefono?: string;
    cellulare?: string;
  } | null;
}

export function CallDialog({ isOpen, onClose, contact }: CallDialogProps) {
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

  const phoneNumbers = [
    { label: 'Telefono', number: contact.telefono },
    { label: 'Cellulare', number: contact.cellulare }
  ].filter(item => item.number);

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

          {/* Numeri disponibili */}
          {phoneNumbers.length > 0 ? (
            <div className="space-y-3">
              {phoneNumbers.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{item.label}</Badge>
                    <span className="font-mono text-sm">{item.number}</span>
                  </div>
                  
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun numero di telefono disponibile</p>
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