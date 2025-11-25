/**
 * Email data transformers for TMWE API
 * Handles conversion between API response formats and component formats
 */

/**
 * Convert EmailAddress type to string
 * Handles both string and object formats
 */
export const convertToString = (addr: any): string => {
  if (typeof addr === 'string') return addr;
  if (addr && typeof addr === 'object') {
    return addr.email || addr.name || 'Unknown';
  }
  return 'Unknown';
};

/**
 * Convert EmailAddress array to string array
 */
export const convertToArray = (addrs: any): string[] => {
  if (Array.isArray(addrs)) {
    return addrs.map(convertToString);
  }
  if (addrs) {
    return [convertToString(addrs)];
  }
  return [];
};

/**
 * Map API email response to EmailList component format
 */
export const mapApiEmailToComponent = (msg: any) => {
  // Extract from_name and from_email from API response
  const fromAddress = msg.from_name || msg.from_email || 
                     (typeof msg.from === 'object' ? (msg.from.name || msg.from.email) : msg.from) || 
                     'Unknown';

  // Populate preview field from multiple possible sources
  const preview = msg.preview || 
                 msg.snippet || 
                 msg.body_preview || 
                 (msg.body_text ? msg.body_text.substring(0, 150) : '') ||
                 (msg.body_html ? msg.body_html.replace(/<[^>]*>/g, '').substring(0, 150) : '') ||
                 '';

  console.log('🔄 [Transformer] Mapping email:', {
    msg_id: msg.id,
    msg_id_type: typeof msg.id,
    msg_uid: msg.uid,
    has_email_id: !!msg.id
  });

  return {
    id: String(msg.uid || msg.id),
    email_id: msg.id,             // ✅ NUEVO: Integer para API calls
    subject: msg.subject || '(No Subject)',
    from: fromAddress,
    preview: preview,
    date: msg.data_ricezione || msg.date ? new Date(msg.data_ricezione || msg.date).toISOString() : new Date().toISOString(),
    read: msg.is_read === true || msg.seen === 1 || msg.read === true,
    starred: msg.is_flagged === true || msg.flagged === 1 || msg.starred === true,
    hasAttachments: !!(
      msg.has_attachments || 
      msg.hasAttachments || 
      msg.attachment_count > 0 ||
      msg.attachmentCount > 0 ||
      (msg.attachments && msg.attachments.length > 0) ||
      (msg.size && parseInt(msg.size) > 50000)
    ),
    group: msg.group || msg.sender_group || null,
    hasRules: msg.hasRules || msg.has_rules || false,
  };
};
