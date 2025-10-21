import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import * as Babel from '@babel/standalone';
import React from 'react';
import ReactDOM from 'react-dom/client';

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
 * Metadata per generazione placeholder intelligente
 */
interface ComponentMetadata {
  component_name?: string;
  ui_category?: string;
  complexity_level?: string;
  tags?: string[];
}

/**
 * Wrapper automatico per codice JSX incompleto
 * Trasforma frammenti di codice in componenti React completi
 */
function wrapComponentCode(jsxCode: string, componentName: string = 'Component'): string {
  // Se è già un export default valido, usalo così com'è
  if (jsxCode.includes('export default')) {
    return jsxCode;
  }
  
  // Altrimenti, wrapper automatico con imports e export
  return `
    import React, { useState, useEffect } from 'react';
    
    // Definizione componente
    const ${componentName} = ${jsxCode.trim()};
    
    // Export per rendering
    export default function Wrapper(props) {
      return (
        <div style={{ padding: '16px', width: '100%', height: '100%' }}>
          <${componentName} {...props} />
        </div>
      );
    }
  `;
}

/**
 * Crea props mock per componenti che richiedono props
 */
function createMockProps(): Record<string, any> {
  return {
    // Event handlers
    onSyncComplete: () => console.log('mock: onSyncComplete'),
    onClose: () => console.log('mock: onClose'),
    onSubmit: () => console.log('mock: onSubmit'),
    onClick: () => console.log('mock: onClick'),
    onChange: () => console.log('mock: onChange'),
    onDelete: () => console.log('mock: onDelete'),
    onEdit: () => console.log('mock: onEdit'),
    onSave: () => console.log('mock: onSave'),
    onCancel: () => console.log('mock: onCancel'),
    
    // Data props
    data: [],
    items: [],
    users: [],
    contacts: [],
    
    // Common props
    isOpen: true,
    isLoading: false,
    disabled: false,
    title: 'Sample Title',
    description: 'Sample description text',
    
    // Strings
    name: 'Sample Name',
    email: 'sample@example.com',
    value: 'Sample Value',
  };
}

/**
 * Genera placeholder intelligente con metadata del componente
 */
function createIntelligentPlaceholder(
  metadata: ComponentMetadata
): string {
  const { component_name = 'Component', ui_category = 'UI', complexity_level = 'medium', tags = [] } = metadata;
  
  // Colori basati su ui_category
  const categoryColors: Record<string, string> = {
    input: '#3b82f6',
    button: '#10b981',
    card: '#8b5cf6',
    layout: '#f59e0b',
    'data-display': '#ec4899',
  };
  
  const bgColor = categoryColors[ui_category] || '#667eea';
  
  return `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ${bgColor} 0%, #764ba2 100%); border-radius: 8px;">
      <div style="background: white; border-radius: 12px; padding: 20px; max-width: 340px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1e293b; line-height: 1.3;">
          ${component_name}
        </h3>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
          <span style="background: ${bgColor}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">
            ${ui_category}
          </span>
          <span style="background: #64748b; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;">
            ${complexity_level}
          </span>
        </div>
        ${tags.length > 0 ? `
          <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
            ${tags.slice(0, 4).join(' • ')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Renderizza componente JSX REALE in un container DOM isolato usando React + Babel
 */
async function createIsolatedContainer(
  jsxCode: string, 
  config: ThumbnailConfig,
  metadata?: ComponentMetadata
): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${config.width}px`;
  container.style.height = `${config.height}px`;
  container.style.backgroundColor = config.backgroundColor;
  container.style.overflow = 'hidden';
  container.style.padding = '0';
  
  // Crea root per rendering React
  const renderRoot = document.createElement('div');
  renderRoot.style.width = '100%';
  renderRoot.style.height = '100%';
  container.appendChild(renderRoot);
  document.body.appendChild(container);

  try {
    // 1. Wrapper automatico per codice incompleto
    const componentName = metadata?.component_name?.replace(/[^a-zA-Z0-9]/g, '') || 'Component';
    const wrappedCode = wrapComponentCode(jsxCode, componentName);
    
    console.log('🔄 Transpiling JSX code...');
    
    // 2. Transpila JSX in JavaScript usando Babel
    const transpiled = Babel.transform(wrappedCode, {
      presets: ['react', 'typescript'],
      filename: 'component.tsx',
    }).code;

    console.log('✅ JSX transpiled successfully');

    // 3. Crea funzione component dal codice transpilato
    const ComponentModule = new Function(
      'React', 
      'exports',
      `${transpiled}\nreturn exports.default || exports;`
    );

    const Component = ComponentModule(React, {});

    // 4. Mock props per componenti che richiedono props
    const mockProps = createMockProps();

    // 5. Renderizza il componente con mock props
    console.log('🎨 Rendering React component...');
    const root = ReactDOM.createRoot(renderRoot);
    root.render(React.createElement(Component, mockProps));

    // 6. Aspetta rendering (importante per componenti con immagini/async)
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('✅ Component rendered');

  } catch (error) {
    console.error('❌ Failed to render component:', error);
    
    // Fallback a placeholder intelligente con metadata
    if (metadata) {
      container.innerHTML = createIntelligentPlaceholder(metadata);
    } else {
      // Fallback generico se nessun metadata
      container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
          <div style="text-align: center; color: white; padding: 16px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p style="margin-top: 8px; font-size: 12px; font-weight: 500;">Render Error</p>
            <p style="margin-top: 4px; font-size: 10px; opacity: 0.8;">Check console</p>
          </div>
        </div>
      `;
    }
  }
  
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
 * Upload thumbnail su Supabase Storage con retry automatico
 */
async function uploadThumbnail(
  componentId: string,
  blob: Blob,
  retries: number = 3
): Promise<string> {
  const fileName = `${componentId}-${Date.now()}.png`;
  const filePath = `thumbnails/${fileName}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📤 Upload attempt ${attempt}/${retries}...`);
      
      // Upload diretto
      const { data, error } = await supabase.storage
        .from('design-lab-thumbnails')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(error.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('design-lab-thumbnails')
        .getPublicUrl(filePath);

      console.log(`✅ Thumbnail uploaded: ${urlData.publicUrl}`);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error(`❌ Upload attempt ${attempt} failed:`, error);
      
      // Se non è l'ultimo tentativo, aspetta prima di riprovare
      if (attempt < retries) {
        const delay = 1000 * attempt; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Ultimo tentativo fallito
        throw new Error(`Failed to upload thumbnail after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  throw new Error('Upload failed');
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
  metadata?: ComponentMetadata,
  customConfig?: Partial<ThumbnailConfig>
): Promise<string> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  let container: HTMLDivElement | null = null;

  try {
    console.log(`🎬 Starting thumbnail generation for: ${metadata?.component_name || componentId}`);
    
    // 1. Crea container isolato e renderizza React component con metadata
    container = await createIsolatedContainer(jsxCode, config, metadata);

    // 2. Genera screenshot
    console.log('📸 Capturing screenshot...');
    const blob = await captureScreenshot(container, config);

    // 3. Upload su Supabase Storage con retry automatico
    const thumbnailUrl = await uploadThumbnail(componentId, blob);

    // 4. Aggiorna database
    console.log('💾 Updating database...');
    await updateComponentThumbnail(componentId, thumbnailUrl);

    console.log(`✅ Thumbnail generated successfully for: ${metadata?.component_name || componentId}`);
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
  components: Array<{ 
    id: string; 
    jsx_code: string;
    component_name?: string;
    ui_category?: string;
    complexity_level?: string;
    tags?: string[];
  }>,
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
      // Passa metadata per placeholder intelligente
      await generateComponentThumbnail(
        component.id, 
        component.jsx_code,
        {
          component_name: component.component_name,
          ui_category: component.ui_category,
          complexity_level: component.complexity_level,
          tags: component.tags,
        }
      );
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(
        `${component.component_name || component.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (onProgress) {
      onProgress(i + 1, components.length);
    }

    // Rate limiting: 200ms delay between requests (aumentato per sicurezza)
    if (i < components.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Interfaccia per lo stato della generazione
 */
export interface ThumbnailGenerationState {
  totalComponents: number;
  currentIndex: number;
  successCount: number;
  failedCount: number;
  isRunning: boolean;
  isPaused: boolean;
  shouldStop: boolean;
  lastProcessedId: string | null;
}

/**
 * Interfaccia per il preview
 */
export interface ThumbnailPreview {
  componentId: string;
  componentName: string;
  thumbnailUrl: string;
  timestamp: number;
  fileSize?: number;
}

/**
 * THUMBNAIL BATCH GENERATOR
 * Genera miniature in batch controllati di 3 per evitare blocchi del browser
 */
export class ThumbnailBatchGenerator {
  private state: ThumbnailGenerationState;
  private components: Array<{ 
    id: string; 
    jsx_code: string; 
    component_name: string;
    ui_category?: string;
    complexity_level?: string;
    tags?: string[];
  }>;
  private onProgressCallback?: (state: ThumbnailGenerationState) => void;
  private onThumbnailCreatedCallback?: (preview: ThumbnailPreview) => void;
  private batchSize: number;

  constructor(batchSize: number = 3) {
    this.batchSize = batchSize;
    this.state = {
      totalComponents: 0,
      currentIndex: 0,
      successCount: 0,
      failedCount: 0,
      isRunning: false,
      isPaused: false,
      shouldStop: false,
      lastProcessedId: null,
    };
    this.components = [];
  }

  /**
   * Carica componenti dal database con metadata completo
   */
  async loadComponents(): Promise<void> {
    const { data, error } = await supabase
      .from('design_lab_extracted_components')
      .select('id, jsx_code, component_name, ui_category, complexity_level, tags')
      .is('thumbnail_url', null)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to load components: ${error.message}`);
    
    this.components = data || [];
    this.state.totalComponents = this.components.length;
    
    console.log(`📋 Loaded ${this.state.totalComponents} components without thumbnails`);
  }

  /**
   * Processa un singolo batch di componenti
   */
  async processBatch(): Promise<void> {
    const batch = this.components.slice(
      this.state.currentIndex,
      this.state.currentIndex + this.batchSize
    );

    console.log(`🔄 Processing batch of ${batch.length} components...`);

    for (const component of batch) {
      if (this.state.shouldStop) {
        console.log('⏹️ Batch processing stopped by user');
        break;
      }

      try {
        console.log(`🔄 [${this.state.currentIndex + 1}/${this.state.totalComponents}] Generating: ${component.component_name}`);
        
        // Genera thumbnail con metadata completo
        const thumbnailUrl = await generateComponentThumbnail(
          component.id, 
          component.jsx_code,
          {
            component_name: component.component_name,
            ui_category: component.ui_category,
            complexity_level: component.complexity_level,
            tags: component.tags,
          }
        );
        
        this.state.successCount++;
        this.state.lastProcessedId = component.id;

        // Notifica preview creato
        if (this.onThumbnailCreatedCallback) {
          console.log(`🎨 Thumbnail created callback for: ${component.component_name}`);
          this.onThumbnailCreatedCallback({
            componentId: component.id,
            componentName: component.component_name,
            thumbnailUrl: thumbnailUrl,
            timestamp: Date.now(),
          });
        } else {
          console.warn('⚠️ No onThumbnailCreatedCallback registered');
        }

        console.log(`✅ [${this.state.successCount}/${this.state.totalComponents}] Success: ${component.component_name}`);
      } catch (error) {
        this.state.failedCount++;
        console.error(`❌ [${this.state.currentIndex + 1}/${this.state.totalComponents}] Failed: ${component.component_name}`, error);
      }

      this.state.currentIndex++;
      
      // Notifica progresso
      if (this.onProgressCallback) {
        this.onProgressCallback({ ...this.state });
      }
    }

    // Pausa 500ms tra batch per non bloccare il browser
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Avvia generazione batch
   */
  async start(): Promise<void> {
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.shouldStop = false;

    await this.loadComponents();

    if (this.components.length === 0) {
      console.log('✅ No thumbnails to generate');
      this.state.isRunning = false;
      return;
    }

    console.log(`🚀 Starting batch generation: ${this.state.totalComponents} components (batch size: ${this.batchSize})`);

    while (this.state.currentIndex < this.state.totalComponents && !this.state.shouldStop) {
      if (this.state.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      await this.processBatch();
    }

    this.state.isRunning = false;
    console.log(`🏁 Generation completed: ${this.state.successCount} success, ${this.state.failedCount} failed`);
  }

  /**
   * Metti in pausa
   */
  pause(): void {
    this.state.isPaused = true;
    console.log('⏸️ Generation paused');
  }

  /**
   * Riprendi
   */
  resume(): void {
    this.state.isPaused = false;
    console.log('▶️ Generation resumed');
  }

  /**
   * Ferma
   */
  stop(): void {
    this.state.shouldStop = true;
    this.state.isRunning = false;
    console.log('⏹️ Generation stopped');
  }

  /**
   * Callback per progresso
   */
  onProgress(callback: (state: ThumbnailGenerationState) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Callback per thumbnail creato
   */
  onThumbnailCreated(callback: (preview: ThumbnailPreview) => void): void {
    this.onThumbnailCreatedCallback = callback;
  }

  /**
   * Ottieni stato corrente
   */
  getState(): ThumbnailGenerationState {
    return { ...this.state };
  }
}

/**
 * Rigenera thumbnails mancanti (LEGACY - usa ThumbnailBatchGenerator)
 * @deprecated Use ThumbnailBatchGenerator instead
 */
export async function regenerateMissingThumbnails(
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const { data: componentsWithoutThumbnails, error } = await supabase
    .from('design_lab_extracted_components')
    .select('id, jsx_code, component_name, ui_category, complexity_level, tags')
    .is('thumbnail_url', null);

  if (error) {
    throw new Error(`Failed to fetch components: ${error.message}`);
  }

  if (!componentsWithoutThumbnails || componentsWithoutThumbnails.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  console.log(`📸 Generazione di ${componentsWithoutThumbnails.length} miniature mancanti...`);

  return await generateBatchThumbnails(componentsWithoutThumbnails, onProgress);
}
