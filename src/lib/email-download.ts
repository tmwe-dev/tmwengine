import { supabase } from "@/integrations/supabase/client";
import { emailMessageApi } from "./tmwe-api-integrated";

/**
 * Download email direttamente dall'API TMWE e salva nel DB Supabase
 * NO EDGE FUNCTIONS - Solo chiamate API dirette
 */
export const downloadEmailsToDatabase = async (
  folder: string,
  maxEmails: number = 100,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; count: number; errors: string[] }> => {
  const errors: string[] = [];
  let savedCount = 0;

  try {
    console.log(`📥 Downloading emails from folder: ${folder}`);
    console.log(`📊 Max emails: ${maxEmails}`);

    // Get user email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    const userEmail = profile?.tmwe_email;
    if (!userEmail) throw new Error('User email not configured');

    // Call TMWE API directly
    const response = await emailMessageApi.getMessages({
      folder,
      limit: maxEmails
    });

    if (!response?.success || !response?.data) {
      throw new Error('Failed to fetch emails from TMWE API');
    }

    const messages = response.data;
    const totalMessages = messages.length;
    
    console.log(`✅ Fetched ${totalMessages} emails from API`);

    // Process and save each email
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      try {
        // Transform TMWE format to DB format
        const emailData = {
          user_email: userEmail,
          from_email: msg.from || '',
          to_email: msg.to || '',
          message_id: msg.message_id || `${folder}_${msg.uid || i}`,
          uid: String(msg.uid || i),
          cartella: folder,
          mittente: msg.from || '',
          destinatari: msg.to || '',
          oggetto: msg.subject || '(No Subject)',
          corpo_testo: msg.body_text || '',
          corpo_html: msg.body_html || msg.body || '',
          body_text: msg.body_text || '',
          body_html: msg.body_html || msg.body || '',
          subject: msg.subject || '(No Subject)',
          data_ricezione: msg.date || new Date().toISOString(),
          direzione: 'received' as const,
          provider_id: null,
          letto: msg.seen || false,
          importante: msg.flagged || false,
          allegati: msg.attachments || null,
          attachments: msg.attachments || null,
          flags: msg.flags || null,
          cc_email: msg.cc || null,
          bcc_email: msg.bcc || null,
          reply_to_email: msg.reply_to || null,
          in_reply_to: msg.in_reply_to || null,
          references: msg.references || null,
          dimensione: msg.size || null,
        };

        // Upsert to database (conflict on message_id)
        const { error: insertError } = await supabase
          .from('email_messages')
          .upsert([emailData], {
            onConflict: 'message_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error(`❌ Error saving email ${i + 1}:`, insertError);
          errors.push(`Email ${i + 1}: ${insertError.message}`);
        } else {
          savedCount++;
          if (onProgress) {
            onProgress(i + 1, totalMessages);
          }
        }
      } catch (emailError: any) {
        console.error(`❌ Error processing email ${i + 1}:`, emailError);
        errors.push(`Email ${i + 1}: ${emailError.message}`);
      }
    }

    console.log(`✅ Download complete: ${savedCount}/${totalMessages} saved`);
    
    return {
      success: errors.length === 0,
      count: savedCount,
      errors
    };

  } catch (error: any) {
    console.error('🔥 Download failed:', error);
    errors.push(`Fatal error: ${error.message}`);
    return {
      success: false,
      count: savedCount,
      errors
    };
  }
};

/**
 * Download email da multiple cartelle
 */
export const downloadMultipleFolders = async (
  folders: string[],
  maxEmailsPerFolder: number = 100,
  onFolderComplete?: (folder: string, count: number) => void
): Promise<{ totalSaved: number; errors: string[] }> => {
  let totalSaved = 0;
  const allErrors: string[] = [];

  for (const folder of folders) {
    console.log(`📂 Processing folder: ${folder}`);
    
    const result = await downloadEmailsToDatabase(folder, maxEmailsPerFolder);
    
    totalSaved += result.count;
    allErrors.push(...result.errors.map(err => `${folder}: ${err}`));
    
    if (onFolderComplete) {
      onFolderComplete(folder, result.count);
    }
  }

  return {
    totalSaved,
    errors: allErrors
  };
};
