import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

export async function generateThumbnail(
  componentId: string,
  htmlContent: string
): Promise<string | null> {
  try {
    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '400px';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Generate screenshot
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      width: 400,
      height: 200,
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    // Upload to Supabase Storage
    const fileName = `${componentId}-${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('design-lab-thumbnails')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('design-lab-thumbnails')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}
