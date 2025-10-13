// Generate Deliverable Edge Function
// Converts structured deliverable content to files and saves to storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, type, format, title, content, metadata } = await req.json();
    
    console.log('📄 Generate deliverable:', { messageId, type, format, title });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Get conversation ID from message
    const { data: message } = await supabase
      .from('chat_laboratory_messages')
      .select('conversation_id')
      .eq('id', messageId)
      .single();
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    const conversationId = message.conversation_id;
    
    // Generate file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${conversationId}/${type}-${timestamp}.${getFileExtension(format)}`;
    
    let fileContent: string | Uint8Array = content;
    
    // Format-specific processing
    if (format === 'csv') {
      // Ensure proper CSV formatting
      fileContent = content.trim();
    } else if (format === 'md') {
      // Add metadata header
      fileContent = `---
title: ${title}
type: ${type}
generated: ${new Date().toISOString()}
---

${content}`;
    } else if (format === 'mermaid') {
      // Save as .mmd file
      fileContent = content;
    } else if (format === 'excalidraw') {
      // Validate and save JSON
      try {
        JSON.parse(content); // Validate
        fileContent = content;
      } catch (e) {
        throw new Error('Invalid Excalidraw JSON');
      }
    }
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-deliverables')
      .upload(fileName, fileContent, {
        contentType: getContentType(format),
        upsert: false
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }
    
    console.log('✅ File uploaded:', uploadData.path);
    
    // Get file size
    const fileSize = new TextEncoder().encode(fileContent).length;
    
    // Save deliverable record
    const { data: deliverable, error: dbError } = await supabase
      .from('chat_laboratory_deliverables')
      .insert({
        message_id: messageId,
        type,
        format,
        storage_path: uploadData.path,
        file_size_bytes: fileSize,
        metadata: {
          title,
          ...metadata,
          generated_at: new Date().toISOString()
        },
        generation_status: 'completed'
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('DB insert error:', dbError);
      throw dbError;
    }
    
    console.log('✅ Deliverable record created:', deliverable.id);
    
    // Get signed URL for download
    const { data: signedUrl } = await supabase.storage
      .from('chat-deliverables')
      .createSignedUrl(uploadData.path, 3600); // 1 hour expiry
    
    return new Response(
      JSON.stringify({
        success: true,
        deliverable: {
          id: deliverable.id,
          type,
          format,
          storage_path: uploadData.path,
          download_url: signedUrl?.signedUrl,
          file_size_bytes: fileSize
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Generate deliverable error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    'md': 'md',
    'pdf': 'pdf',
    'csv': 'csv',
    'mermaid': 'mmd',
    'excalidraw': 'excalidraw',
    'json': 'json'
  };
  return extensions[format] || 'txt';
}

function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    'md': 'text/markdown',
    'pdf': 'application/pdf',
    'csv': 'text/csv',
    'mermaid': 'text/plain',
    'excalidraw': 'application/json',
    'json': 'application/json'
  };
  return contentTypes[format] || 'text/plain';
}
