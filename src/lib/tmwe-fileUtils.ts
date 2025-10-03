/**
 * Format bytes to human readable size (KB, MB, GB)
 */
export const formatFileSize = (bytes: number | string): string => {
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  
  if (isNaN(numBytes) || numBytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  if (numBytes < k) {
    return `${numBytes} Bytes`;
  }
  
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  const size = numBytes / Math.pow(k, i);
  
  // Format with 2 decimals for KB and above
  return `${size.toFixed(2)} ${sizes[i]}`;
};

/**
 * Download a file from base64 content
 */
export const downloadBase64File = (
  base64Content: string,
  filename: string,
  contentType?: string
): void => {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = base64Content.includes(',') 
      ? base64Content.split(',')[1] 
      : base64Content;
    
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob
    const blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};
