/**
 * Processa immagini inline CID (Content-ID) nelle email HTML
 * Converte riferimenti cid: in data URLs base64
 */

export interface EmailAttachment {
  filename?: string;
  content_id?: string;
  content_type?: string;
  data?: string; // base64 encoded data
}

/**
 * Sostituisce i riferimenti cid: nell'HTML con data URLs base64
 * @param htmlBody - Il corpo HTML dell'email
 * @param attachments - Array di allegati email con content_id e data
 * @returns HTML con cid: sostituiti da data URLs
 */
export function processCidImages(htmlBody: string, attachments?: EmailAttachment[]): string {
  if (!htmlBody || !attachments || attachments.length === 0) {
    return htmlBody;
  }

  let processedHtml = htmlBody;

  // Crea mappa content_id -> attachment per lookup veloce
  const cidMap = new Map<string, EmailAttachment>();
  attachments.forEach(attachment => {
    if (attachment.content_id) {
      // Normalizza content_id (rimuovi < > se presenti)
      const cleanCid = attachment.content_id.replace(/^<|>$/g, '');
      cidMap.set(cleanCid, attachment);
    }
  });

  // Pattern per trovare src="cid:..." o src='cid:...'
  const cidPattern = /src=["']cid:([^"']+)["']/gi;

  processedHtml = processedHtml.replace(cidPattern, (match, contentId) => {
    const attachment = cidMap.get(contentId);
    
    if (attachment && attachment.data) {
      // Determina il content type (default a image/jpeg se non specificato)
      const contentType = attachment.content_type || 'image/jpeg';
      
      // Costruisci data URL
      const dataUrl = `data:${contentType};base64,${attachment.data}`;
      
      return `src="${dataUrl}"`;
    }
    
    // Se non troviamo l'allegato, lascia il cid: originale
    // (verrà gestito dal placeholder di errore esistente)
    return match;
  });

  return processedHtml;
}
