import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { extractCompanyName, extractInitials, formatDate } from '@/lib/smart-inbox-utils';
import { getCategoryGradient, getCategoryGlow } from '@/lib/category-gradients';
import { Paperclip, CheckCircle2, AlertCircle, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { toast } from 'sonner';

interface SmartEmailDetailPanelProps {
  classifiedEmail: ClassifiedEmail;
  onClose: () => void;
}

export const SmartEmailDetailPanel = ({ classifiedEmail, onClose }: SmartEmailDetailPanelProps) => {
  // ✅ Usa body_html con fallback a body_text
  const emailBody = {
    html: classifiedEmail.email.body_html || classifiedEmail.email.body_text,
    text: classifiedEmail.email.body_text
  };
  const isLoadingBody = false; // Nessun caricamento necessario

  // 🔒 Sanitizza HTML con sicurezza avanzata
  const sanitizedHtml = emailBody.html 
    ? DOMPurify.sanitize(emailBody.html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'img', 'div', 'span', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'thead', 'tbody', 'tfoot'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'width', 'height', 'align', 'target', 'loading', 'srcset', 'sizes'],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):)/i, // ✅ Permetti data:image per immagini inline
        ADD_ATTR: ['target']
      })
    : null;

  const { classification, email } = classifiedEmail;
  const categoryGradient = getCategoryGradient(classification.category);
  const categoryGlow = getCategoryGlow(classification.category);
  const companyName = extractCompanyName(classification.sender_email);
  const initials = extractInitials(classification.sender_email);
  const isVerified = classification.is_verified && classification.confidence >= 80;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#1c1c28]/80 via-[#23233a]/60 to-[#0e0e18]/70 backdrop-blur-md rounded-2xl border border-white/10 animate-fade-in">
      {/* Pseudo-element for diagonal light reflection */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent opacity-50" />
      </div>

      {/* Header con chiudi */}
      <div className="relative shrink-0 px-6 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="rounded-full bg-white/10 border border-white/20 p-1">
          <Avatar className="h-12 w-12">
            {classification.sender_logo_url ? (
              <AvatarImage src={classification.sender_logo_url} alt={companyName} />
            ) : null}
            <AvatarFallback className="text-sm font-semibold bg-transparent">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate text-white/90">{companyName}</div>
          <div className="text-sm text-white/70 truncate">
            {classification.sender_email}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Contenuto scrollabile */}
      <ScrollArea className="relative flex-1 px-6">
        <div className="space-y-3 py-3">
          {/* Stato classificazione */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-white border-0 ${categoryGradient} ${categoryGlow}`}
            >
              <span className="font-semibold">{classification.category}</span>
            </Badge>
            {isVerified ? (
              <Badge className="bg-white/10 border border-white/20 text-white/80 rounded-full backdrop-blur-sm shadow-sm">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
                Verificata
              </Badge>
            ) : (
              <Badge className="bg-white/10 border border-white/20 text-white/80 rounded-full backdrop-blur-sm shadow-sm">
                <AlertCircle className="h-3 w-3 mr-1 text-orange-400" />
                Da Verificare ({Math.round(classification.confidence)}%)
              </Badge>
            )}
          </div>

          {/* Riassunto AI */}
          {classification.ai_summary && (
            <details className="space-y-2" open>
              <summary className="font-semibold text-sm flex items-center gap-2 cursor-pointer text-white/90 hover:text-white transition-colors">
                <ChevronDown className="h-4 w-4 transition-transform" />
                <span className="text-lg">📝</span>
                Riassunto AI
              </summary>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl mt-2">
                <p className="text-sm text-white/85">{classification.ai_summary}</p>
              </div>
            </details>
          )}

          {/* Keywords */}
          {classification.keywords && classification.keywords.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-white/90">
                <span className="text-lg">🏷️</span>
                Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {classification.keywords.map((keyword, idx) => (
                  <Badge 
                    key={idx} 
                    className="bg-white/10 border border-white/15 text-white/90 rounded-full px-2 py-0.5"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Oggetto email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-white/90">Oggetto</h3>
              <span className="text-xs text-white/60">
                {formatDate(email.date)}
              </span>
            </div>
            <p className="text-sm font-medium bg-white/5 p-3 rounded-lg border border-white/10 text-white/85">
              {email.subject || 'Nessun oggetto'}
            </p>
          </div>

          {/* Corpo email collapsible */}
          <details className="space-y-2">
            <summary className="font-semibold text-sm flex items-center gap-2 cursor-pointer text-white/90 hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4 transition-transform" />
              <span className="text-lg">📧</span>
              Messaggio Completo
              {isLoadingBody && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </summary>
            <div className="mt-2">
              {isLoadingBody ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/60" />
                  <p className="text-sm text-white/70 mt-2">Caricamento...</p>
                </div>
              ) : sanitizedHtml ? (
                <div 
                  className="prose prose-sm prose-invert max-w-none p-4 text-white overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  style={{
                    color: 'rgba(255, 255, 255, 0.95) !important',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    background: 'transparent'
                  }}
                />
              ) : emailBody?.text ? (
                <pre className="text-sm whitespace-pre-wrap bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 font-sans text-white/85">
                  {emailBody.text}
                </pre>
              ) : (
                <p className="text-sm text-white/70 italic bg-white/5 p-4 rounded-xl border border-white/10">
                  Contenuto non disponibile
                </p>
              )}
            </div>
          </details>

          {/* Allegati */}
          {email.has_attachments && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-white/90">
                <Paperclip className="h-4 w-4" />
                Allegati
              </h3>
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <p className="text-sm text-white/70">
                  Questa email contiene allegati
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* CSS ottimizzato per email HTML */}
      <style>{`
        /* Override forzato per testo dentro email */
        .prose,
        .prose * {
          color: rgba(255, 255, 255, 0.95) !important;
          background: transparent !important;
        }

        /* Immagini sempre visibili */
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
          display: block;
          object-fit: contain;
          background: transparent;
        }

        /* Nascondi immagini rotte */
        .prose img[src=""],
        .prose img:not([src]) {
          display: none;
        }

        /* Tabelle */
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
        }
        .prose table td,
        .prose table th {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 8px;
          background: transparent !important;
        }

        /* Link */
        .prose a {
          color: #60a5fa !important;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .prose a:hover {
          color: #93c5fd !important;
        }
      `}</style>
    </div>
  );
};
