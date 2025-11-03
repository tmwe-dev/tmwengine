import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-4">
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

        return (
          <div
            key={email.id}
            className={`
              border-l-4 pl-4 py-3
              ${isCurrent 
                ? cleanMode 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-purple-500 bg-purple-500/10'
                : cleanMode
                  ? 'border-gray-300 bg-white'
                  : 'border-white/20 bg-white/5'
              }
              ${cleanMode ? '' : 'backdrop-blur-sm rounded-lg'}
            `}
          >
            {/* Header con toggle */}
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => !isCurrent && toggleCollapse(index)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${cleanMode ? 'text-black' : 'text-white'}`}>
                    {email.from_email}
                  </span>
                  {isCurrent && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                      Corrente
                    </span>
                  )}
                </div>
                <div className={`text-sm ${cleanMode ? 'text-gray-600' : 'text-white/70'}`}>
                  {formatDate(email.data_ricezione)}
                </div>
              </div>

              {!isCurrent && (
                <Button variant="ghost" size="sm">
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {/* Body (collapsible per vecchie email) */}
            {(!isCollapsed || isCurrent) && (
              <div className="mt-3 space-y-2">
                <h3 className={`font-semibold ${cleanMode ? 'text-black' : 'text-white'}`}>
                  {email.subject}
                </h3>
                <div
                  className={`prose ${cleanMode ? 'prose-slate' : 'prose-invert'} max-w-none`}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(email.body_html || email.body_text || '')
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
