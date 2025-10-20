import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

/**
 * DESIGN LAB THUMBNAIL GENERATOR
 * Genera screenshot PNG dei componenti estratti usando html2canvas
 */

interface ThumbnailConfig {
  width: number;
  height: number;
  scale: number;
  backgroundColor: string;
}

const DEFAULT_CONFIG: ThumbnailConfig = {
  width: 400,
  height: 300,
  scale: 2, // Retina quality
  backgroundColor: '#ffffff',
};

/**
 * Renderizza componente JSX in un container DOM isolato
 */
function createIsolatedContainer(jsxCode: string, config: ThumbnailConfig): HTMLDivElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${config.width}px`;
  container.style.height = `${config.height}px`;
  container.style.backgroundColor = config.backgroundColor;
  container.style.overflow = 'hidden';
  container.style.padding = '16px';
  
  // Inject component preview (simplified HTML render)
  // In produzione, si potrebbe usare un iframe con React render
  container.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <div style="text-align: center; color: #64748b;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <p style="margin-top: 8px; font-size: 14px;">Component Preview</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  return container;
}

/**
 * Genera screenshot PNG usando html2canvas
 */
async function captureScreenshot(
  element: HTMLElement,
  config: ThumbnailConfig
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    width: config.width,
    height: config.height,
    scale: config.scale,
    backgroundColor: config.backgroundColor,
    logging: false,
    useCORS: true,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate blob from canvas'));
        }
      },
      'image/png',
      0.9
    );
  });
}

/**
 * Upload thumbnail su Supabase Storage
 */
async function uploadThumbnail(
  componentId: string,
  blob: Blob
): Promise<string> {
  const fileName = `${componentId}-${Date.now()}.png`;
  const filePath = `thumbnails/${fileName}`;

  const { data, error } = await supabase.storage
    .from('design-lab-thumbnails')
    .upload(filePath, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload thumbnail: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('design-lab-thumbnails')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Aggiorna thumbnail_url nel database
 */
async function updateComponentThumbnail(
  componentId: string,
  thumbnailUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('design_lab_extracted_components')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', componentId);

  if (error) {
    console.error('Database update error:', error);
    throw new Error(`Failed to update thumbnail URL: ${error.message}`);
  }
}

/**
 * MAIN FUNCTION: Genera e salva thumbnail per un componente
 */
export async function generateComponentThumbnail(
  componentId: string,
  jsxCode: string,
  customConfig?: Partial<ThumbnailConfig>
): Promise<string> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  let container: HTMLDivElement | null = null;

  try {
    // 1. Crea container isolato
    container = createIsolatedContainer(jsxCode, config);

    // 2. Genera screenshot
    const blob = await captureScreenshot(container, config);

    // 3. Upload su Supabase Storage
    const thumbnailUrl = await uploadThumbnail(componentId, blob);

    // 4. Aggiorna database
    await updateComponentThumbnail(componentId, thumbnailUrl);

    console.log(`✅ Thumbnail generated for component ${componentId}`);
    return thumbnailUrl;
  } catch (error) {
    console.error(`❌ Failed to generate thumbnail for ${componentId}:`, error);
    throw error;
  } finally {
    // 5. Cleanup DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Genera thumbnails per batch di componenti
 */
export async function generateBatchThumbnails(
  components: Array<{ id: string; jsx_code: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    
    try {
      await generateComponentThumbnail(component.id, component.jsx_code);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(
        `${component.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (onProgress) {
      onProgress(i + 1, components.length);
    }

    // Rate limiting: 100ms delay between requests
    if (i < components.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
