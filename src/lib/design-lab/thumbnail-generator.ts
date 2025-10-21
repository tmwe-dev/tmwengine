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
 * Crea mock components avanzati per shadcn/ui
 */
function createMockComponents() {
  const React = window.React;
  return {
    Button: ({ children, ...props }: any) => React.createElement('button', { ...props, className: 'px-4 py-2 bg-blue-500 text-white rounded' }, children),
    Card: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'border rounded-lg p-4 bg-white shadow' }, children),
    CardHeader: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'mb-4' }, children),
    CardTitle: ({ children, ...props }: any) => React.createElement('h3', { ...props, className: 'text-lg font-semibold' }, children),
    CardDescription: ({ children, ...props }: any) => React.createElement('p', { ...props, className: 'text-sm text-gray-500' }, children),
    CardContent: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'space-y-2' }, children),
    CardFooter: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'mt-4 flex gap-2' }, children),
    Input: (props: any) => React.createElement('input', { ...props, className: 'border rounded px-3 py-2 w-full' }),
    Label: ({ children, ...props }: any) => React.createElement('label', { ...props, className: 'text-sm font-medium' }, children),
    Badge: ({ children, ...props }: any) => React.createElement('span', { ...props, className: 'px-2 py-1 text-xs rounded bg-gray-100' }, children),
    Alert: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'border rounded p-4 bg-blue-50' }, children),
    AlertTitle: ({ children, ...props }: any) => React.createElement('h5', { ...props, className: 'font-semibold mb-1' }, children),
    AlertDescription: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'text-sm' }, children),
    ScrollArea: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'overflow-auto', style: { maxHeight: '400px' } }, children),
    Progress: ({ value, ...props }: any) => React.createElement('div', { ...props, className: 'w-full bg-gray-200 rounded h-2' }, 
      React.createElement('div', { className: 'bg-blue-500 h-full rounded', style: { width: `${value || 0}%` } })
    ),
    Tabs: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'space-y-2' }, children),
    TabsList: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'flex gap-1 border-b' }, children),
    TabsTrigger: ({ children, ...props }: any) => React.createElement('button', { ...props, className: 'px-3 py-2 text-sm' }, children),
    TabsContent: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'mt-2' }, children),
    Dialog: ({ children, open, ...props }: any) => open ? React.createElement('div', { ...props, className: 'fixed inset-0 bg-black/50 flex items-center justify-center' }, children) : null,
    DialogContent: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'bg-white rounded-lg p-6 max-w-md' }, children),
    DialogHeader: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'mb-4' }, children),
    DialogTitle: ({ children, ...props }: any) => React.createElement('h2', { ...props, className: 'text-xl font-bold' }, children),
    Select: ({ children, ...props }: any) => React.createElement('div', { ...props, className: 'relative' }, children),
    SelectTrigger: ({ children, ...props }: any) => React.createElement('button', { ...props, className: 'border rounded px-3 py-2 w-full text-left' }, children),
    SelectValue: ({ placeholder, ...props }: any) => React.createElement('span', props, placeholder),
    Checkbox: (props: any) => React.createElement('input', { ...props, type: 'checkbox', className: 'w-4 h-4' }),
    Switch: (props: any) => React.createElement('button', { ...props, className: 'w-10 h-6 rounded-full bg-gray-200' }),
    Separator: (props: any) => React.createElement('hr', { ...props, className: 'my-2 border-gray-200' }),
    Skeleton: (props: any) => React.createElement('div', { ...props, className: 'bg-gray-200 animate-pulse rounded' }),
    Table: ({ children, ...props }: any) => React.createElement('table', { ...props, className: 'w-full border-collapse' }, children),
    TableHeader: ({ children, ...props }: any) => React.createElement('thead', props, children),
    TableBody: ({ children, ...props }: any) => React.createElement('tbody', props, children),
    TableRow: ({ children, ...props }: any) => React.createElement('tr', { ...props, className: 'border-b' }, children),
    TableHead: ({ children, ...props }: any) => React.createElement('th', { ...props, className: 'p-2 text-left font-semibold' }, children),
    TableCell: ({ children, ...props }: any) => React.createElement('td', { ...props, className: 'p-2' }, children),
  };
}

/**
 * Crea mock icons da lucide-react
 */
function createMockIcons() {
  const React = window.React;
  const MockIcon = ({ className, ...props }: any) => 
    React.createElement('svg', { 
      width: 20, 
      height: 20, 
      viewBox: '0 0 24 24', 
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      className,
      ...props
    }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
  
  return {
    CheckCircle: MockIcon,
    AlertCircle: MockIcon,
    Loader2: MockIcon,
    Mail: MockIcon,
    Send: MockIcon,
    Trash: MockIcon,
    Edit: MockIcon,
    Save: MockIcon,
    X: MockIcon,
    Plus: MockIcon,
    Minus: MockIcon,
    ChevronDown: MockIcon,
    ChevronRight: MockIcon,
    Search: MockIcon,
    Settings: MockIcon,
    User: MockIcon,
    Home: MockIcon,
    Menu: MockIcon,
    Calendar: MockIcon,
    Clock: MockIcon,
    Download: MockIcon,
    Upload: MockIcon,
    File: MockIcon,
    Folder: MockIcon,
    Archive: MockIcon,
    Database: MockIcon,
    Server: MockIcon,
    Code: MockIcon,
    Terminal: MockIcon,
  };
}

/**
 * Crea mock hooks comuni
 */
function createMockHooks() {
  return {
    useToast: () => ({ toast: () => {}, dismiss: () => {} }),
    useAuth: () => ({ user: { id: 'mock-user', email: 'user@example.com' }, isLoading: false }),
    useSupabase: () => ({ supabase: null }),
    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/', search: '', hash: '' }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), () => {}],
  };
}

/**
 * Wrapper automatico per codice JSX incompleto con mock avanzati
 */
function wrapComponentCode(jsxCode: string, componentName: string = 'Component'): string {
  // Se è già un export default valido, usalo così com'è
  if (jsxCode.includes('export default')) {
    return jsxCode;
  }
  
  const mockComponents = createMockComponents();
  const mockIcons = createMockIcons();
  const mockHooks = createMockHooks();
  
  // Serializza i mock per iniettarli nel codice
  const componentsCode = Object.entries(mockComponents)
    .map(([name, _]) => `const ${name} = mockComponents.${name};`)
    .join('\n    ');
  
  const iconsCode = Object.entries(mockIcons)
    .map(([name, _]) => `const ${name} = mockIcons.${name};`)
    .join('\n    ');
  
  const hooksCode = Object.entries(mockHooks)
    .map(([name, fn]) => `const ${name} = () => ${JSON.stringify(fn())};`)
    .join('\n    ');
  
  // Altrimenti, wrapper automatico con imports e mock injection
  return `
    import React, { useState, useEffect } from 'react';
    
    // Mock shadcn/ui components
    const mockComponents = ${JSON.stringify(Object.fromEntries(Object.keys(mockComponents).map(k => [k, 'MOCK'])))};
    ${componentsCode}
    
    // Mock lucide-react icons
    const mockIcons = ${JSON.stringify(Object.fromEntries(Object.keys(mockIcons).map(k => [k, 'MOCK'])))};
    ${iconsCode}
    
    // Mock hooks comuni
    ${hooksCode}
    
    // Mock supabase client
    const supabase = {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
    };
    
    // Definizione componente originale
    const ${componentName} = ${jsxCode.trim()};
    
    // Export wrapper per rendering sicuro
    export default function Wrapper(props) {
      try {
        return (
          <div style={{ padding: '16px', width: '100%', height: '100%' }}>
            <${componentName} {...props} />
          </div>
        );
      } catch (error) {
        return (
          <div style={{ padding: '16px', color: 'red', fontSize: '12px' }}>
            Render Error: {error.message}
          </div>
        );
      }
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

    // 6. Aspetta rendering (aumentato a 3s per componenti complessi)
    await new Promise(resolve => setTimeout(resolve, 3000));
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
 * Genera placeholder PNG intelligente basato su metadata
 */
async function generatePlaceholderThumbnail(
  componentId: string,
  metadata?: ComponentMetadata
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  
  // Gradient background basato su categoria
  const categoryColors: Record<string, [string, string]> = {
    input: ['#3b82f6', '#1e40af'],
    button: ['#10b981', '#059669'],
    card: ['#8b5cf6', '#6d28d9'],
    layout: ['#f59e0b', '#d97706'],
    'data-display': ['#ec4899', '#be185d'],
    modal: ['#667eea', '#764ba2'],
  };
  
  const [color1, color2] = categoryColors[metadata?.ui_category?.toLowerCase() || ''] || ['#667eea', '#764ba2'];
  
  const gradient = ctx.createLinearGradient(0, 0, 400, 300);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 300);
  
  // Testo componente
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(metadata?.component_name || 'Component', 200, 140);
  
  // Badge categoria
  if (metadata?.ui_category) {
    ctx.font = '12px Arial';
    ctx.fillText(metadata.ui_category, 200, 170);
  }
  
  // Converti in blob e upload
  const blob = await new Promise<Blob>((resolve) => 
    canvas.toBlob((b) => resolve(b!), 'image/png')
  );
  
  const thumbnailUrl = await uploadThumbnail(componentId, blob);
  await updateComponentThumbnail(componentId, thumbnailUrl);
  return thumbnailUrl;
}

/**
 * NUOVA FUNZIONE: Genera thumbnail CSS-only (200-300ms) senza Babel/React
 */
async function generateCSSOnlyThumbnail(
  componentId: string,
  jsxCode: string,
  metadata?: ComponentMetadata
): Promise<string> {
  const startTime = Date.now();
  console.log(`⚡ Generating CSS-only thumbnail for: ${metadata?.component_name || componentId}`);
  
  // Analisi JSX con regex (NO Babel)
  const hasDialog = /Dialog|Modal|Sheet/i.test(jsxCode);
  const hasForm = /Form|Input|TextField|Select/i.test(jsxCode);
  const hasTable = /Table|DataGrid|tbody/i.test(jsxCode);
  const hasChart = /Chart|Graph|Recharts/i.test(jsxCode);
  const hasCard = /Card|Panel/i.test(jsxCode);
  const hasButton = /Button|btn/i.test(jsxCode);
  
  // Colori basati su categoria
  const categoryColors: Record<string, string> = {
    input: '#3b82f6',
    button: '#10b981',
    card: '#8b5cf6',
    layout: '#f59e0b',
    'data-display': '#ec4899',
    modal: '#667eea',
  };
  
  const primaryColor = categoryColors[metadata?.ui_category?.toLowerCase() || ''] || '#667eea';
  
  // Genera HTML statico basato su analisi
  let mockHTML = `
    <div style="width: 400px; height: 300px; padding: 20px; background: linear-gradient(135deg, ${primaryColor} 0%, #764ba2 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, sans-serif;">
      <div style="background: white; border-radius: 12px; padding: 24px; max-width: 340px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); width: 100%;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #1e293b;">
          ${metadata?.component_name || 'Component'}
        </h3>
  `;
  
  // Aggiungi elementi UI in base all'analisi
  if (hasForm) {
    mockHTML += `
      <div style="margin-bottom: 12px;">
        <label style="font-size: 12px; color: #64748b; display: block; margin-bottom: 4px;">Input Field</label>
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc;"></div>
      </div>
    `;
  }
  
  if (hasButton) {
    mockHTML += `
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <div style="background: ${primaryColor}; color: white; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500;">Action</div>
        <div style="border: 1px solid ${primaryColor}; color: ${primaryColor}; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500;">Cancel</div>
      </div>
    `;
  }
  
  if (hasTable) {
    mockHTML += `
      <div style="margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <div style="background: #f8fafc; padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">Header</div>
        <div style="padding: 6px; font-size: 10px;">Row 1</div>
        <div style="padding: 6px; font-size: 10px; background: #fafafa;">Row 2</div>
      </div>
    `;
  }
  
  if (hasCard) {
    mockHTML += `
      <div style="margin-top: 8px; display: flex; gap: 6px;">
        <span style="background: ${primaryColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px;">${metadata?.ui_category || 'UI'}</span>
        <span style="background: #64748b; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px;">${metadata?.complexity_level || 'medium'}</span>
      </div>
    `;
  }
  
  mockHTML += `
      </div>
    </div>
  `;
  
  // Crea container temporaneo per html2canvas
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.innerHTML = mockHTML;
  document.body.appendChild(container);
  
  try {
    // html2canvas su HTML statico (molto più veloce senza React/Babel)
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      width: 400,
      height: 300,
      scale: 2,
      backgroundColor: null,
      logging: false,
    });
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png', 0.9);
    });
    
    const thumbnailUrl = await uploadThumbnail(componentId, blob);
    await updateComponentThumbnail(componentId, thumbnailUrl);
    
    console.log(`✅ CSS-only thumbnail generated in ${Date.now() - startTime}ms`);
    return thumbnailUrl;
    
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * MAIN FUNCTION: Genera e salva thumbnail per un componente con gestione avanzata errori
 */
export async function generateComponentThumbnail(
  componentId: string,
  jsxCode: string,
  metadata?: ComponentMetadata,
  customConfig?: Partial<ThumbnailConfig>
): Promise<string> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const startTime = Date.now();
  let container: HTMLDivElement | null = null;

  try {
    console.log(`🎬 Starting thumbnail generation for: ${metadata?.component_name || componentId}`);
    
    // ⚡ OTTIMIZZAZIONE: usa CSS-only per componenti < 15KB (80% dei casi)
    if (jsxCode.length < 15000) {
      console.log(`⚡ Using fast CSS-only generation (${jsxCode.length} chars)`);
      return await generateCSSOnlyThumbnail(componentId, jsxCode, metadata);
    }
    
    // Pre-validazione: componenti troppo grandi usano placeholder
    if (jsxCode.length > 25000) {
      console.warn(`⚠️ Component too large (${jsxCode.length} chars), using placeholder`);
      const thumbnailUrl = await generatePlaceholderThumbnail(componentId, metadata);
      
      // Log nel database
      await supabase.from('thumbnail_generation_logs').insert({
        component_id: componentId,
        component_name: metadata?.component_name || 'Unknown',
        status: 'skipped',
        error_message: `Component too large (${jsxCode.length} chars)`,
        duration_ms: Date.now() - startTime,
      });
      
      return thumbnailUrl;
    }
    
    // Timeout con Promise.race (10 secondi max)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Thumbnail generation timeout (10s)')), 10000)
    );
    
    const generatePromise = (async () => {
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

      return thumbnailUrl;
    })();
    
    const thumbnailUrl = await Promise.race([generatePromise, timeoutPromise]);
    
    // Log successo nel database
    await supabase.from('thumbnail_generation_logs').insert({
      component_id: componentId,
      component_name: metadata?.component_name || 'Unknown',
      status: 'success',
      duration_ms: Date.now() - startTime,
    });

    console.log(`✅ Thumbnail generated successfully for: ${metadata?.component_name || componentId}`);
    return thumbnailUrl;
    
  } catch (error) {
    console.error(`❌ Failed to generate thumbnail for ${componentId}:`, error);
    
    // Log errore nel database
    await supabase.from('thumbnail_generation_logs').insert({
      component_id: componentId,
      component_name: metadata?.component_name || 'Unknown',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : null,
      duration_ms: Date.now() - startTime,
    });
    
    // Fallback a placeholder invece di fallire completamente
    try {
      console.log('🔄 Generating placeholder as fallback...');
      return await generatePlaceholderThumbnail(componentId, metadata);
    } catch (placeholderError) {
      console.error('❌ Placeholder generation also failed:', placeholderError);
      throw error; // Lancia errore originale
    }
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
   * Processa un singolo componente (serializzazione completa)
   */
  async processBatch(): Promise<void> {
    // CRITICO: Ora processiamo 1 componente alla volta (batch size dovrebbe essere 1)
    const component = this.components[this.state.currentIndex];
    
    if (!component || this.state.shouldStop) {
      if (this.state.shouldStop) {
        console.log('⏹️ Processing stopped by user');
      }
      return;
    }

    console.group(`🔄 [${this.state.currentIndex + 1}/${this.state.totalComponents}] ${component.component_name}`);
    console.log('├─ Component ID:', component.id);
    console.log('├─ Code size:', `${component.jsx_code.length} chars`);
    console.log('├─ Complexity:', component.complexity_level || 'unknown');
    console.log('├─ UI Category:', component.ui_category || 'unknown');

    const startTime = Date.now();

    try {
      // 1. Genera miniatura (include già upload + update DB)
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
      
      const duration = Date.now() - startTime;
      console.log('├─ Duration:', `${duration}ms`);
      console.log('├─ Thumbnail URL:', thumbnailUrl);
      console.log('└─ Status: ✅ SUCCESS');
      
      // 2. ATTENDI CONFERMA DATABASE (verifica che record sia stato scritto)
      console.log('⏳ Waiting for database confirmation...');
      await this.waitForDatabaseConfirmation(component.id);
      
      this.state.successCount++;
      this.state.lastProcessedId = component.id;

      // Callback preview creato
      if (this.onThumbnailCreatedCallback) {
        this.onThumbnailCreatedCallback({
          componentId: component.id,
          componentName: component.component_name,
          thumbnailUrl: thumbnailUrl,
          timestamp: Date.now(),
        });
      }

    } catch (error) {
      this.state.failedCount++;
      console.log('└─ Status: ❌ FAILED');
      console.error('Error:', error);
    }
    
    console.groupEnd();

    this.state.currentIndex++;
    
    // 3. PAUSA OBBLIGATORIA 1 SECONDO (invece di 500ms)
    console.log('⏳ Safety pause (1000ms)...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Notifica progresso
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...this.state });
    }
  }

  /**
   * NUOVA FUNZIONE: Verifica che il record sia stato effettivamente salvato
   */
  private async waitForDatabaseConfirmation(componentId: string): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const { data, error } = await supabase
          .from('design_lab_extracted_components')
          .select('thumbnail_url')
          .eq('id', componentId)
          .single();
        
        if (error) throw error;
        
        if (data?.thumbnail_url) {
          console.log('✅ Database confirmation received');
          return; // Successo!
        }
        
        // Se non c'è ancora, attendi 200ms e riprova
        await new Promise(resolve => setTimeout(resolve, 200));
        attempt++;
        
      } catch (error) {
        console.warn(`⚠️ DB confirmation attempt ${attempt + 1} failed:`, error);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.warn('⚠️ Database confirmation timeout (continuing anyway)');
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
