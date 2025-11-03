import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/smart-inbox-utils';
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
            {/* 🆕 Separatore tra email */}
            {index > 0 && (
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />
            )}

            {/* 🆕 Badge Inizio Conversazione */}
            {isFirstEmail && (
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  🚀 Inizio Conversazione
                </Badge>
                <span className={`text-xs ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                  {formatDate(email.data_ricezione)}
                </span>
              </div>
            )}

            {/* Card Email */}
            <div
              className={`
                border-l-4 pl-6 py-4 rounded-lg
                ${isCurrent 
                  ? cleanMode 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-purple-500 bg-purple-500/10 shadow-lg'
                  : cleanMode
                    ? 'border-gray-300 bg-white shadow-sm'
                    : 'border-white/20 bg-white/5'
                }
                ${cleanMode ? '' : 'backdrop-blur-sm'}
              `}
            >
              {/* 🆕 Header Strutturato */}
              <div
                className="flex items-start justify-between cursor-pointer mb-3"
                onClick={() => !isCurrent && toggleCollapse(index)}
              >
                <div className="flex-1 space-y-1">
                  {/* Riga 1: Mittente + Badge Corrente */}
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-base ${cleanMode ? 'text-black' : 'text-white'}`}>
                      {email.from_email}
                    </span>
                    {isCurrent && (
                      <Badge className="text-xs bg-blue-500 text-white">
                        Corrente
                      </Badge>
                    )}
                  </div>

                  {/* Riga 2: Data */}
                  <div className={`text-sm font-medium ${cleanMode ? 'text-gray-600' : 'text-white/80'}`}>
                    📅 {formatDate(email.data_ricezione)}
                  </div>

                  {/* Riga 3: Destinatari */}
                  {email.to_email && (
                    <div className={`text-xs ${cleanMode ? 'text-gray-500' : 'text-white/60'}`}>
                      A: {Array.isArray(email.to_email) ? email.to_email.join(', ') : email.to_email}
                    </div>
                  )}
                </div>

                {/* Toggle collapse */}
                {!isCurrent && (
                  <Button variant="ghost" size="sm">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {/* Body (collapsible per vecchie email) */}
              {(!isCollapsed || isCurrent) && (
                <div className="mt-3 space-y-2">
                  <h3 className={`font-semibold email-body-content ${cleanMode ? 'text-black' : 'text-white'}`}>
                    {email.subject}
                  </h3>
                  <div
                    className={`prose ${cleanMode ? 'prose-slate' : 'prose-invert'} max-w-none email-body-content`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(email.body_html || email.body_text || '')
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
