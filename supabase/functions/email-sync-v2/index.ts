import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  folders: string[];
  user_email: string;
}

interface ProgressUpdate {
  type: 'progress' | 'log' | 'complete' | 'error';
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { folders, user_email }: SyncRequest = await req.json();

    console.log('🚀 Email Sync v2 started');
    console.log('📂 Folders:', folders);
    console.log('👤 User:', user_email);

    // Get OAuth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      throw new Error('User not authenticated');
    }

    // Get TMWE credentials
    const { data: credentials, error: credErr } = await supabase
      .from('user_tmwe_credentials')
      .select('access_token')
      .eq('email', user.email)
      .eq('token_type', 'oauth')
      .maybeSingle();

    if (!credentials?.access_token) {
      throw new Error('TMWE OAuth token not found. Please login first.');
    }

    const oauthToken = credentials.access_token;
    const TMWE_API_BASE = 'https://app.tmwengine.com/api';

    let totalDownloaded = 0;
    let totalErrors = 0;

    // Create ReadableStream for progress updates
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (update: ProgressUpdate) => {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(update) + '\n'));
        };

        try {
          sendUpdate({
            type: 'log',
            data: {
              phase: 'preparing',
              message: `🚀 Edge Sync v2: Starting sync for ${folders.length} folders`
            }
          });

          // Process each folder
          for (const folderName of folders) {
            sendUpdate({
              type: 'log',
              data: {
                phase: 'preparing',
                folder: folderName,
                message: `📁 Processing folder: ${folderName}`
              }
            });

            // Step 1: Get metadata from TMWE API
            sendUpdate({
              type: 'log',
              data: {
                phase: 'preparing',
                folder: folderName,
                message: '  ├─ 🔍 Fetching metadata from TMWE API...'
              }
            });

            let allMetadata: any[] = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
              const metadataResponse = await fetch(
                `${TMWE_API_BASE}/email_search`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${oauthToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    handler: 'get_emails_metadata',
                    folder_name: folderName,
                    offset,
                    limit
                  })
                }
              );

              if (!metadataResponse.ok) {
                throw new Error(`Failed to fetch metadata: ${metadataResponse.statusText}`);
              }

              const metadataData = await metadataResponse.json();
              const emails = metadataData.emails || [];
              
              allMetadata = allMetadata.concat(emails);
              
              sendUpdate({
                type: 'progress',
                data: {
                  current_folder: folderName,
                  imported: totalDownloaded,
                  total: allMetadata.length,
                  errors: totalErrors
                }
              });

              hasMore = emails.length === limit;
              offset += limit;

              if (emails.length > 0) {
                sendUpdate({
                  type: 'log',
                  data: {
                    phase: 'importing',
                    folder: folderName,
                    message: `  ├─ 📨 Fetched ${allMetadata.length} emails metadata`
                  }
                });
              }
            }

            if (allMetadata.length === 0) {
              sendUpdate({
                type: 'log',
                data: {
                  phase: 'skip',
                  folder: folderName,
                  message: '  └─ ⏭️  No emails in folder'
                }
              });
              continue;
            }

            // Step 2: Check which emails already exist in DB
            const uids = allMetadata.map(e => e.uid);
            
            const { data: existing, error: existingErr } = await supabase
              .from('email_messages')
              .select('message_id')
              .eq('cartella', folderName)
              .eq('user_email', user_email);

            if (existingErr) {
              console.error('Error checking existing emails:', existingErr);
            }

            const existingMessageIds = new Set(existing?.map(e => e.message_id) || []);
            const missingEmails = allMetadata.filter(
              email => !existingMessageIds.has(`${folderName}/${email.uid}`)
            );

            sendUpdate({
              type: 'log',
              data: {
                phase: 'preparing',
                folder: folderName,
                message: `  ├─ ✅ Found ${missingEmails.length} new emails to download`
              }
            });

            if (missingEmails.length === 0) {
              sendUpdate({
                type: 'log',
                data: {
                  phase: 'skip',
                  folder: folderName,
                  message: '  └─ ⏭️  All emails already synced'
                }
              });
              continue;
            }

            // Step 3: Download details in parallel batches
            const PARALLEL_LIMIT = 5;
            const emailsToProcess = [...missingEmails];
            
            sendUpdate({
              type: 'log',
              data: {
                phase: 'importing',
                folder: folderName,
                message: `  ├─ 📥 Downloading ${emailsToProcess.length} email bodies (${PARALLEL_LIMIT} parallel)...`
              }
            });

            while (emailsToProcess.length > 0) {
              const batch = emailsToProcess.splice(0, PARALLEL_LIMIT);
              
              const detailPromises = batch.map(async (email) => {
                try {
                  const detailResponse = await fetch(
                    `${TMWE_API_BASE}/email_search`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${oauthToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        handler: 'get_email_detail',
                        folder_name: folderName,
                        uid: email.uid
                      })
                    }
                  );

                  if (!detailResponse.ok) {
                    throw new Error(`Failed to fetch detail for UID ${email.uid}`);
                  }

                  const detailData = await detailResponse.json();
                  return { ...email, ...detailData.email };
                } catch (error) {
                  console.error(`Error fetching email ${email.uid}:`, error);
                  totalErrors++;
                  return null;
                }
              });

              const detailedEmails = (await Promise.all(detailPromises)).filter(e => e !== null);

              // Step 4: Save to database
              if (detailedEmails.length > 0) {
                const emailsToInsert = detailedEmails.map(email => ({
                  message_id: `${folderName}/${email.uid}`,
                  from_email: email.from_email || '',
                  to_email: email.to_email || '',
                  cc_email: email.cc_email || null,
                  bcc_email: email.bcc_email || null,
                  subject: email.subject || '',
                  body_text: email.body_text || '',
                  body_html: email.body_html || '',
                  data_ricezione: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
                  cartella: folderName,
                  direzione: 'inbound' as const,
                  stato: email.flags?.includes('\\Seen') ? 'letto' as const : 'nuovo' as const,
                  flags: Array.isArray(email.flags) ? email.flags : [],
                  attachments: Array.isArray(email.attachments) ? email.attachments : [],
                  provider_id: '00000000-0000-0000-0000-000000000000',
                  user_email: user_email,
                  sync_status: 'sincronizzato' as const,
                }));

                const { error: insertErr } = await supabase
                  .from('email_messages')
                  .insert(emailsToInsert);

                if (insertErr) {
                  console.error('Error inserting emails:', insertErr);
                  totalErrors += detailedEmails.length;
                } else {
                  totalDownloaded += detailedEmails.length;
                }

                sendUpdate({
                  type: 'progress',
                  data: {
                    current_folder: folderName,
                    imported: totalDownloaded,
                    total: missingEmails.length,
                    errors: totalErrors
                  }
                });

                sendUpdate({
                  type: 'log',
                  data: {
                    phase: 'importing',
                    folder: folderName,
                    message: `  ├─ 💾 Saved ${detailedEmails.length} emails (${totalDownloaded}/${missingEmails.length})`
                  }
                });
              }

              // Small delay between batches
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            sendUpdate({
              type: 'log',
              data: {
                phase: 'completed',
                folder: folderName,
                message: `  └─ ✅ Folder completed: ${totalDownloaded} downloaded, ${totalErrors} errors`
              }
            });
          }

          sendUpdate({
            type: 'complete',
            data: {
              total_downloaded: totalDownloaded,
              total_errors: totalErrors,
              folders_completed: folders.length
            }
          });

          controller.close();
        } catch (error) {
          console.error('Edge sync error:', error);
          sendUpdate({
            type: 'error',
            data: {
              message: error.message
            }
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Email sync v2 error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
