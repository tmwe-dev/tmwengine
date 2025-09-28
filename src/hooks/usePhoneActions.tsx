import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PhoneConfig {
  defaultCountryCode: string;
  enableWhatsApp: boolean;
  whatsAppBusiness: boolean;
  phoneFormat: 'international' | 'national' | 'local';
  autoDetectCountry: boolean;
}

interface PhoneValidation {
  isValid: boolean;
  formatted: string;
  country?: string;
  type?: 'mobile' | 'landline' | 'unknown';
}

const DEFAULT_CONFIG: PhoneConfig = {
  defaultCountryCode: '+39',
  enableWhatsApp: true,
  whatsAppBusiness: false,
  phoneFormat: 'international',
  autoDetectCountry: true
};

export function usePhoneActions() {
  const [config, setConfig] = useState<PhoneConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carica configurazioni dal database
  useEffect(() => {
    loadPhoneConfig();
  }, []);

  const loadPhoneConfig = async () => {
    try {
      // Per ora uso localStorage per le configurazioni phone
      // In futuro si può estendere il database
      const savedConfig = localStorage.getItem('phone_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (error) {
      console.error('Error loading phone config:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePhoneConfig = async (newConfig: Partial<PhoneConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      localStorage.setItem('phone_config', JSON.stringify(updatedConfig));
      setConfig(updatedConfig);
      
      toast({
        title: "Configurazione salvata",
        description: "Le impostazioni telefono sono state aggiornate.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le configurazioni telefono.",
        variant: "destructive"
      });
    }
  };

  // Valida e formatta un numero di telefono
  const validateAndFormatNumber = (phoneNumber: string): PhoneValidation => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return { isValid: false, formatted: '' };
    }

    // Rimuove tutti i caratteri non numerici eccetto +
    let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Se non inizia con + e autoDetectCountry è attivo, aggiungi il prefisso predefinito
    if (config.autoDetectCountry && !cleanNumber.startsWith('+')) {
      cleanNumber = config.defaultCountryCode + cleanNumber;
    }

    // Validazione base: deve avere almeno 8 cifre dopo il prefisso paese
    const numberWithoutCountry = cleanNumber.replace(/^\+\d{1,4}/, '');
    const isValid = numberWithoutCountry.length >= 7 && numberWithoutCountry.length <= 15;

    // Determina il tipo (mobile vs fisso) basato sul prefisso italiano
    let type: 'mobile' | 'landline' | 'unknown' = 'unknown';
    if (cleanNumber.startsWith('+39')) {
      const italianNumber = numberWithoutCountry;
      if (italianNumber.startsWith('3') || italianNumber.startsWith('8')) {
        type = 'mobile';
      } else if (italianNumber.match(/^0\d/)) {
        type = 'landline';
      }
    } else if (cleanNumber.startsWith('+1')) {
      // US/Canada - numeri a 10 cifre
      type = numberWithoutCountry.length === 10 ? 'mobile' : 'unknown';
    }

    // Formatta il numero secondo le preferenze
    let formatted = cleanNumber;
    if (isValid && config.phoneFormat === 'national' && cleanNumber.startsWith(config.defaultCountryCode)) {
      formatted = cleanNumber.substring(config.defaultCountryCode.length);
    } else if (config.phoneFormat === 'local') {
      formatted = phoneNumber.replace(/[^\d]/g, '');
    }

    return {
      isValid,
      formatted: isValid ? formatted : cleanNumber,
      country: cleanNumber.startsWith('+39') ? 'IT' : 'unknown',
      type
    };
  };

  // Gestisce chiamata telefonica
  const makePhoneCall = (phoneNumber: string) => {
    const validation = validateAndFormatNumber(phoneNumber);
    
    if (!validation.isValid) {
      toast({
        title: "Numero non valido",
        description: "Il numero di telefono inserito non è valido.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const telUrl = `tel:${validation.formatted}`;
      window.open(telUrl, '_self');
      
      // Analytics/logging opzionale
      console.log(`Phone call initiated to: ${validation.formatted} (${validation.type})`);
      
      return true;
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile avviare la chiamata.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Gestisce messaggio WhatsApp
  const sendWhatsAppMessage = (phoneNumber: string, message?: string) => {
    if (!config.enableWhatsApp) {
      toast({
        title: "WhatsApp disabilitato",
        description: "WhatsApp è disabilitato nelle impostazioni.",
        variant: "destructive"
      });
      return false;
    }

    const validation = validateAndFormatNumber(phoneNumber);
    
    if (!validation.isValid) {
      toast({
        title: "Numero non valido",
        description: "Il numero di telefono per WhatsApp non è valido.",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Rimuove il + per WhatsApp
      const whatsappNumber = validation.formatted.startsWith('+') 
        ? validation.formatted.substring(1) 
        : validation.formatted;
      
      // Costruisce URL WhatsApp
      const baseUrl = config.whatsAppBusiness 
        ? 'https://api.whatsapp.com/send' 
        : 'https://wa.me';
      
      let whatsappUrl = `${baseUrl}/${whatsappNumber}`;
      
      // Aggiunge messaggio se fornito
      if (message && message.trim()) {
        const encodedMessage = encodeURIComponent(message.trim());
        whatsappUrl += `?text=${encodedMessage}`;
      }
      
      window.open(whatsappUrl, '_blank');
      
      // Analytics/logging opzionale
      console.log(`WhatsApp message initiated to: ${whatsappNumber} (${config.whatsAppBusiness ? 'Business' : 'Personal'})`);
      
      return true;
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aprire WhatsApp.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Formatta numero per visualizzazione
  const formatForDisplay = (phoneNumber: string): string => {
    const validation = validateAndFormatNumber(phoneNumber);
    return validation.formatted;
  };

  // Verifica se WhatsApp è disponibile per un tipo di numero
  const isWhatsAppAvailable = (phoneNumber: string): boolean => {
    if (!config.enableWhatsApp) return false;
    
    const validation = validateAndFormatNumber(phoneNumber);
    // WhatsApp funziona meglio con numeri mobile, ma accetta anche fissi
    return validation.isValid;
  };

  return {
    config,
    loading,
    savePhoneConfig,
    validateAndFormatNumber,
    makePhoneCall,
    sendWhatsAppMessage,
    formatForDisplay,
    isWhatsAppAvailable
  };
}