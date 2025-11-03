import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate, formatDateDetailed } from '@/lib/smart-inbox-utils';
import DOMPurify from 'dompurify';

interface EmailThreadViewProps {
  emails: any[];
  currentEmailIndex: number;
  hasMore: boolean;
  onLoadMore: () => void;
  cleanMode?: boolean;
}

export const EmailThreadView: React.FC<EmailThreadViewProps> = ({
  emails,
  currentEmailIndex,
  hasMore,
  onLoadMore,
  cleanMode = false
}) => {
  const [collapsedIndices, setCollapsedIndices] = useState<Set<number>>(() => {
    const initialCollapsed = new Set<number>();
    emails.forEach((_, i) => {
      if (i !== currentEmailIndex) {
        initialCollapsed.add(i);
      }
    });
    return initialCollapsed;
  });

  const toggleCollapse = (index: number) => {
    setCollapsedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Handler per immagini che non caricano
  React.useEffect(() => {
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      
      // Crea placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'bg-gray-700/50 p-3 rounded text-center text-xs text-white/60 border border-white/10';
      placeholder.innerHTML = '🖼️ Immagine non disponibile';
      
      // Sostituisci immagine con placeholder
      img.parentNode?.replaceChild(placeholder, img);
    };

    // Applica listener a tutte le immagini
    const images = document.querySelectorAll('.email-body-content img');
    images.forEach(img => {
      img.addEventListener('error', handleImageError);
    });

    // Cleanup
    return () => {
      images.forEach(img => {
        img.removeEventListener('error', handleImageError);
      });
    };
  }, [emails]);

  if (emails.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Load More Button (se thread paginato) */}
      {hasMore && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          className="w-full"
        >
          Carica email precedenti
        </Button>
      )}

      {/* Thread Messages */}
      {emails.map((email, index) => {
        const isCurrent = index === currentEmailIndex;
        const isCollapsed = collapsedIndices.has(index);
        const isFirstEmail = index === 0;

        return (
          <div key={email.id}>
            {/* Separatore più evidente */}
            {index > 0 && (
              <div className="my-6">
                <div className="h-0.5 bg-gradient-to-r from-transparent via-purple-400/40 to-transparent rounded-full" />
              </div>
            )}

            {/* Badge inizio conversazione stilizzato */}
            {isFirstEmail && (
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`
                  text-xs font-semibold
                  ${cleanMode 
                    ? 'bg-green-100 text-green-700 border-green-300' 
                    : 'bg-green-500/20 text-green-400 border-green-500/30 backdrop-blur-sm'
                  }
                `}>
                  🚀 Inizio Conversazione
                </Badge>
                <span className={`text-xs ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                  {formatDateDetailed(email.data_ricezione)}
                </span>
              </div>
            )}

            {/* Card Email */}
            <div
              className={`
                border-l-4 pl-6 py-5 rounded-lg relative
                ${isCurrent 
                  ? cleanMode 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-purple-500 bg-purple-500/15 shadow-xl'
                  : cleanMode
                    ? 'border-gray-300 bg-white shadow-sm'
                    : 'border-white/20 bg-white/5 shadow-md'
                }
                ${cleanMode ? '' : 'backdrop-blur-sm'}
              `}
            >
              {/* Header Strutturato */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Riga 1: Mittente + Badge Corrente */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-lg ${cleanMode ? 'text-black' : 'text-white'}`}>
                        {email.from_email}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          📧 Email Corrente
                        </Badge>
                      )}
                    </div>

                    {/* Riga 2: Data Dettagliata */}
                    <div className={`text-sm font-medium ${cleanMode ? 'text-gray-600' : 'text-white/80'}`}>
                      📅 {formatDateDetailed(email.data_ricezione)}
                    </div>

                    {/* Riga 3: Destinatari con guard */}
                    {email.to_email && (Array.isArray(email.to_email) ? email.to_email.length > 0 : email.to_email) && (
                      <div className={`text-xs ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                        A: {Array.isArray(email.to_email) 
                          ? email.to_email.filter(Boolean).join(', ') 
                          : email.to_email}
                      </div>
                    )}
                  </div>

                  {/* Toggle collapse posizionato top-right */}
                  {!isCurrent && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(index);
                      }}
                      className="absolute top-4 right-4"
                    >
                      {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Body (collapsible per vecchie email) */}
              {(!isCollapsed || isCurrent) && (
                <div className="space-y-3">
                  <h3 className={`
                    font-semibold text-base break-words 
                    border-l-4 border-purple-400/50 pl-4 py-2 rounded
                    ${cleanMode ? 'text-black bg-gray-50' : 'text-white bg-white/5'}
                  `}>
                    {email.subject}
                  </h3>
                  <div
                    className={`prose ${cleanMode ? 'prose-slate' : 'prose-invert'} max-w-none email-body-content mt-4`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(email.body_html || email.body_text || '', {
                        ADD_TAGS: ['img', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'a', 'span', 'div', 'p', 'br', 'strong', 'em', 'u'],
                        ADD_ATTR: ['src', 'alt', 'width', 'height', 'href', 'target', 'rel', 'title', 'style'],
                        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|cid|data):)/i,
                        KEEP_CONTENT: true,
                        ALLOW_DATA_ATTR: false
                      })
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
