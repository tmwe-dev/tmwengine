import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { ThumbnailGenerationOptions } from './types';

/**
 * Genera miniatura per una sezione prompt usando html2canvas
 * Salva in Supabase Storage e restituisce URL pubblico
 */
export async function generateThumbnailForSection(
  sectionId: string, 
  sectionName: string, 
  content: string,
  options: ThumbnailGenerationOptions = {}
): Promise<string> {
  const {
    width = 600,
    scale = 2,
    backgroundColor = '#ffffff'
  } = options;

  console.log(`📸 Generating thumbnail for: ${sectionName}`);

  // Crea elemento DOM temporaneo per rendering
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.padding = '24px';
  container.style.backgroundColor = backgroundColor;
  container.style.borderRadius = '8px';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  
  // Preview truncato a 500 caratteri
  const preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
  
  // HTML del prompt con escape caratteri speciali
  container.innerHTML = `
    <div style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #1a1a1a; line-height: 1.3;">
      ${sectionName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
    <div style="font-size: 14px; line-height: 1.6; color: #444; white-space: pre-wrap; max-height: 400px; overflow: hidden;">
      ${preview.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
  `;
  
  document.body.appendChild(container);

  try {
    // Genera screenshot con html2canvas
    const canvas = await html2canvas(container, {
      backgroundColor,
      scale, // Qualità retina
      logging: false,
      useCORS: true,
      allowTaint: false,
    });

    console.log(`✅ Canvas generated: ${canvas.width}x${canvas.height}px`);

    // Converti canvas a blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob from canvas'));
        },
        'image/png',
        0.9 // Qualità PNG
      );
    });

    console.log(`💾 Blob created: ${(blob.size / 1024).toFixed(2)} KB`);

    // Upload a Supabase Storage con versioning per cache invalidation
    const timestamp = Date.now();
    const fileName = `prompt-thumbnails/${sectionId}_${timestamp}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-laboratory')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false, // NO upsert, crea sempre nuovo file per cache invalidation
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log(`☁️ Uploaded to: ${fileName}`);

    // Ottieni URL pubblico
    const { data: urlData } = supabase.storage
      .from('chat-laboratory')
      .getPublicUrl(fileName);

    const thumbnailUrl = urlData.publicUrl;

    // Aggiorna DB con nuovo thumbnail_url
    const { error: updateError } = await supabase
      .from('chat_laboratory_prompt_sections')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', sectionId);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Thumbnail saved: ${thumbnailUrl}`);

    // CLEANUP: Rimuovi vecchi thumbnail se esistono (max 2 versioni)
    try {
      const { data: oldFiles } = await supabase.storage
        .from('chat-laboratory')
        .list('prompt-thumbnails', {
          search: sectionId,
        });

      if (oldFiles && oldFiles.length > 2) {
        // Ordina per timestamp (filename contiene timestamp)
        const sortedFiles = oldFiles.sort((a, b) => {
          const aTime = parseInt(a.name.split('_')[1]?.replace('.png', '') || '0');
          const bTime = parseInt(b.name.split('_')[1]?.replace('.png', '') || '0');
          return bTime - aTime; // Decrescente
        });

        // Rimuovi tutti tranne i 2 più recenti
        const filesToDelete = sortedFiles.slice(2).map(f => `prompt-thumbnails/${f.name}`);
        
        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('chat-laboratory')
            .remove(filesToDelete);
          console.log(`🗑️ Cleaned up ${filesToDelete.length} old thumbnails`);
        }
      }
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup error (non-critical):', cleanupError);
    }

    return thumbnailUrl;
  } catch (error) {
    console.error('❌ Thumbnail generation failed:', error);
    throw error;
  } finally {
    // Cleanup DOM
    document.body.removeChild(container);
  }
}

/**
 * Genera miniature per multiple sezioni (batch)
 * Con pausa tra generazioni per non sovraccaricare
 */
export async function generateThumbnailsForSections(
  sections: Array<{ id: string; section_name: string; content: string; thumbnail_url?: string | null }>,
  onProgress?: (current: number, total: number, sectionName: string) => void
): Promise<{ success: number; failed: number; errors: Array<{ sectionId: string; error: string }> }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ sectionId: string; error: string }>,
  };

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Skip se ha già thumbnail (rigenerazione manuale)
    if (section.thumbnail_url) {
      console.log(`⏭️ Skipping ${section.section_name} (already has thumbnail)`);
      continue;
    }

    try {
      onProgress?.(i + 1, sections.length, section.section_name);
      
      await generateThumbnailForSection(
        section.id,
        section.section_name,
        section.content
      );
      
      results.success++;
      
      // Pausa 500ms tra generazioni per evitare sovraccarico browser
      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Failed to generate thumbnail for ${section.section_name}:`, error);
      results.failed++;
      results.errors.push({
        sectionId: section.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Rigenera thumbnail esistente (force update)
 */
export async function regenerateThumbnail(
  sectionId: string,
  sectionName: string,
  content: string
): Promise<string> {
  console.log(`🔄 Regenerating thumbnail for: ${sectionName}`);
  return generateThumbnailForSection(sectionId, sectionName, content);
}
