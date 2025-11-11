/**
 * Utilities for extracting email body and subject from various API response formats
 */

/**
 * Extract email body content from multiple possible field names
 */
export const extractEmailBody = (msg: any, header?: any): string => {
  return msg.body_html || 
         msg.body_plain || 
         msg.body_text || 
         msg.body || 
         msg.html || 
         msg.text || 
         msg.content || 
         msg.body_content || 
         msg.message_body ||
         header?.body_html ||
         header?.body_plain ||
         '<p>No content available</p>';
};

/**
 * Extract email subject from multiple possible field names
 */
export const extractEmailSubject = (msg: any, header?: any): string => {
  return header?.subject || 
         msg.subject || 
         header?.title || 
         msg.title || 
         header?.subject_line || 
         msg.subject_line ||
         '(No Subject)';
};
