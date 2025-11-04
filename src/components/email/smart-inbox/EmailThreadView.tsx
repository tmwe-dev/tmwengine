import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate, formatDateDetailed } from '@/lib/smart-inbox-utils';
import { cleanEmailBody } from '@/lib/email-thread-utils';
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

  // Handler per immagini che non caricano (broken images)
  React.useEffect(() => {
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      
      // Crea placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'bg-gray-700/50 p-3 rounded text-center text-xs text-white/60 border border-white/10 inline-block';
      placeholder.textContent = '🖼️ Immagine non disponibile';
      
      // Sostituisci immagine con placeholder
      if (img.parentNode) {
        img.parentNode.replaceChild(placeholder, img);
      }
    };

    // Applica listener a tutte le immagini nel body email
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
          <React.Fragment key={email.id}>
            {/* Badge inizio conversazione (FUORI dalla card) */}
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
              </div>
            )}

            {/* 🆕 CARD EMAIL INDIPENDENTE */}
            <Card
              className={`
                mb-8 transition-all
                ${isCurrent 
                  ? cleanMode 
                    ? 'border-2 border-purple-500 bg-purple-50 shadow-lg' 
                    : 'border-2 border-purple-500 bg-purple-900/30 shadow-xl backdrop-blur-sm'
                  : email.from_email?.toLowerCase().includes('tmwe')
                    ? cleanMode
                      ? 'border border-blue-300 bg-blue-50 shadow-md'
                      : 'border border-blue-500/50 bg-blue-900/20 shadow-md backdrop-blur-sm'
                    : cleanMode
                      ? 'border border-gray-300 bg-gray-50 shadow-md'
                      : 'border border-white/30 bg-gray-900/40 shadow-md backdrop-blur-sm'
                }
              `}
            >
              <CardHeader className="pb-4">
                {/* 🆕 HEADER FORMATTATO A DUE COLONNE */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                {/* Colonna Sinistra: Mittente + Email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-bold text-lg ${cleanMode ? 'text-black' : 'text-white'}`}>
                      {email.from_email 
                        ? (email.from_email.includes('@') 
                            ? email.from_email.split('@')[0] 
                            : email.from_email)
                        : 'Mittente Sconosciuto'
                      }
                    </span>
                    {isCurrent && (
                      <Badge className="bg-blue-500 text-white text-xs shrink-0">
                        📧 Corrente
                      </Badge>
                    )}
                  </div>
                  <div className={`text-sm truncate mb-1 ${cleanMode ? 'text-gray-600' : 'text-white/70'}`}>
                    {email.from_email}
                  </div>
                  {/* Destinatari sotto (se presenti) */}
                  {email.to_email && (Array.isArray(email.to_email) ? email.to_email.length > 0 : email.to_email) && (
                    <div className={`text-xs truncate ${cleanMode ? 'text-gray-500' : 'text-white/50'}`}>
                      A: {Array.isArray(email.to_email) 
                        ? email.to_email.filter(Boolean).join(', ') 
                        : email.to_email}
                    </div>
                  )}
                </div>

                {/* Colonna Destra: Data + Ora + Toggle */}
                <div className="flex items-start gap-2 shrink-0 ml-4">
                  <div className="flex flex-col items-end gap-1">
                    <div className={`text-sm font-semibold whitespace-nowrap ${cleanMode ? 'text-gray-700' : 'text-white/90'}`}>
                      📅 {new Date(email.data_ricezione).toLocaleDateString('it-IT', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className={`text-xs whitespace-nowrap ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                      🕐 {new Date(email.data_ricezione).toLocaleTimeString('it-IT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>

                  {/* Toggle collapse (SE non è email corrente) */}
                  {!isCurrent && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(index);
                      }}
                      className="shrink-0"
                    >
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              </CardHeader>

              {/* Body Email (collapsible) */}
              {(!isCollapsed || isCurrent) && (
                <CardContent>
                  <div className="space-y-3">
                  {/* Oggetto */}
                  <h3 className={`
                    font-semibold text-base break-words 
                    border-l-4 border-purple-400/50 pl-4 py-2 rounded
                    ${cleanMode ? 'text-black bg-gray-50' : 'text-white bg-white/5'}
                  `}>
                    {email.subject}
                  </h3>

                  {/* Debug: HTML Raw Preview (solo in development) */}
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mb-2 text-xs">
                      <summary className={`cursor-pointer ${cleanMode ? 'text-gray-500' : 'text-white/50'}`}>
                        🔍 Debug: HTML Raw (primi 1000 caratteri)
                      </summary>
                      <pre className={`overflow-auto max-h-40 text-[10px] p-2 rounded mt-1 ${
                        cleanMode ? 'bg-gray-100 text-gray-700' : 'bg-white/5 text-white/30'
                      }`}>
                        {email.body_html?.substring(0, 1000) || 'Nessun HTML'}
                      </pre>
                    </details>
                  )}

                  {/* Contenuto HTML */}
                  <div
                    className={`prose prose-slate max-w-none email-body-content mt-4 ${cleanMode ? 'email-body-light' : ''}`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(cleanEmailBody(email.body_html || email.body_text || ''), {
                        ADD_TAGS: ['img', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'a', 'span', 'div', 'p', 'br', 'strong', 'em', 'u', 'o:p', 'v:shapetype', 'w:anchorlock'],
                        ADD_ATTR: ['src', 'alt', 'width', 'height', 'href', 'target', 'rel', 'title', 'style', 'lang', 'mso-fareast-language'],
                        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|cid|data):)/i,
                        KEEP_CONTENT: true,
                        ALLOW_DATA_ATTR: false
                      })
                    }}
                  />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Separatore DOPO la card (solo tra email consecutive) */}
            {index < emails.length - 1 && (
              <div className="h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent my-6" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
