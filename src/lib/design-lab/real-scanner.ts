import { Project, SyntaxKind, SourceFile, FunctionDeclaration, VariableDeclaration, InterfaceDeclaration, TypeAliasDeclaration } from 'ts-morph';
import { supabase } from '@/integrations/supabase/client';
import type { ScanConfig, ScanResult } from '@/types/design-lab-scanner';
import { generateComponentThumbnail } from './thumbnail-generator';

/**
 * DESIGN LAB SCANNER - FASE 1 COMPLETA
 * Scanner AST reale che analizza tutto il codebase TypeScript/TSX
 * Estrae componenti, funzioni, props, dependencies da tutti i file
 */
export class RealDesignLabScanner {
  private project: Project;
  private config: ScanConfig;
  private progressCallback?: (progress: number, task: string) => void;

  constructor(config: ScanConfig) {
    this.config = config;
    this.project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * Main scan entry point - scans all TypeScript/TSX files
   */
  async scanAllPages(): Promise<ScanResult> {
    this.reportProgress(5, 'Inizializzazione scanner AST...');

    // Step 1: Load all source files from code_index
    await this.loadSourceFiles();
    this.reportProgress(10, `Caricati ${this.project.getSourceFiles().length} file da code_index`);

    // Step 2: Extract routes from App.tsx
    const routes = this.extractRoutes();
    this.reportProgress(20, `Estratte ${routes.length} route da App.tsx`);

    // Step 3: Clear existing data
    await this.clearExistingData();
    this.reportProgress(25, 'Database pulito, inizio scansione...');

    // Step 4: Scan all pages
    const pagesResult = await this.scanPages(routes);
    this.reportProgress(50, `Scannerizzate ${pagesResult.pagesScanned} pagine`);

    // Step 5: Scan all components
    const componentsResult = await this.scanComponents();
    this.reportProgress(75, `Estratti ${componentsResult.componentsExtracted} componenti`);

    // Step 6: Scan all functions
    const functionsResult = await this.scanFunctions();
    this.reportProgress(90, `Estratte ${functionsResult.functionsExtracted} funzioni`);

    this.reportProgress(100, 'Scansione completata!');

    return {
      pages_scanned: pagesResult.pagesScanned,
      components_extracted: componentsResult.componentsExtracted,
      functions_extracted: functionsResult.functionsExtracted,
      plugins_created: 0,
      thumbnails_generated: componentsResult.thumbnailsGenerated,
      hooks_cataloged: 0,
    };
  }

  /**
   * Load all TypeScript/TSX source files from code_index table
   */
  private async loadSourceFiles(): Promise<void> {
    this.reportProgress(5, 'Caricamento file da code_index...');
    
    const { data: files, error } = await supabase
      .from('code_index')
      .select('file_path, content')
      .or('file_path.like.src/%,file_path.like./src/%')
      .not('file_path', 'like', '%/integrations/supabase/types.ts')
      .not('file_path', 'like', '%.test.ts')
      .not('file_path', 'like', '%.test.tsx');

    if (error) {
      console.error('❌ Errore caricamento code_index:', error);
      throw new Error(`Impossibile caricare i file: ${error.message}`);
    }

    if (!files || files.length === 0) {
      throw new Error('Nessun file trovato in code_index. Esegui prima l\'indicizzazione del codebase.');
    }

    // Crea source files in memoria usando ts-morph
    files.forEach(file => {
      this.project.createSourceFile(file.file_path, file.content, { overwrite: true });
    });

    this.reportProgress(10, `Caricati ${files.length} file da code_index`);
  }

  /**
   * Extract routes from App.tsx
   */
  private extractRoutes(): Array<{ path: string; component: string; category: string }> {
    const appFile = this.project.getSourceFile('src/App.tsx');
    if (!appFile) return [];

    const routes: Array<{ path: string; component: string; category: string }> = [];
    const routeElements = appFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);

    routeElements.forEach(element => {
      const tagName = element.getTagNameNode().getText();
      if (tagName !== 'Route') return;

      const pathAttr = element.getAttribute('path');
      const elementAttr = element.getAttribute('element');

      if (!pathAttr || !elementAttr) return;
      if (pathAttr.getKind() === SyntaxKind.JsxSpreadAttribute) return;
      if (elementAttr.getKind() === SyntaxKind.JsxSpreadAttribute) return;

      const path = pathAttr.asKind(SyntaxKind.JsxAttribute)?.getInitializer()?.getText().replace(/['"]/g, '') || '';
      const elementText = elementAttr.asKind(SyntaxKind.JsxAttribute)?.getInitializer()?.getText() || '';

      // Extract component name from JSX (e.g., <Rubrica /> -> Rubrica)
      const componentMatch = elementText.match(/<(\w+)/);
      const component = componentMatch ? componentMatch[1] : '';

      if (!component || component === 'ProtectedRoute' || component === 'CRMLayout') return;

      // Categorize based on path
      const category = this.categorizeRoute(path);

      routes.push({ path, component, category });
    });

    return routes;
  }

  /**
   * Categorize route based on path
   */
  private categorizeRoute(path: string): string {
    if (path.includes('rubrica') || path.includes('attivita') || path.includes('campagne')) return 'Commercial';
    if (path.includes('email') || path.includes('tmwe')) return 'Email';
    if (path.includes('chat') || path.includes('radio')) return 'Chat';
    if (path.includes('admin') || path.includes('config') || path.includes('settings')) return 'Admin';
    if (path.includes('intranet')) return 'Intranet';
    if (path.includes('import')) return 'Import';
    if (path.includes('design-lab')) return 'DesignLab';
    return 'Other';
  }

  /**
   * Clear existing scanner data from database
   */
  private async clearExistingData(): Promise<void> {
    await supabase.from('design_lab_extracted_functions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('design_lab_extracted_components').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('design_lab_source_pages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  /**
   * Scan all pages from routes
   */
  private async scanPages(routes: Array<{ path: string; component: string; category: string }>): Promise<{ pagesScanned: number }> {
    let pagesScanned = 0;

    console.log(`📄 [SCANNER] Scansione di ${routes.length} pagine...`);

    for (const route of routes) {
      try {
        console.log(`🔍 [SCANNER] Scansione pagina: ${route.component} (${route.path})`);
        
        const sourceFile = this.findComponentFile(route.component);
        if (!sourceFile) {
          console.warn(`⚠️ [SCANNER] File non trovato per: ${route.component}`);
          continue;
        }

        const pageData = {
          page_name: route.component,
          page_path: route.path,
          category: route.category,
          description: this.extractDescription(sourceFile),
          total_components: this.countComponentsInFile(sourceFile),
          total_functions: this.countFunctionsInFile(sourceFile),
          complexity_score: this.calculateComplexity(sourceFile),
          scanned_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('design_lab_source_pages')
          .insert(pageData);

        if (!error) {
          pagesScanned++;
          console.log(`✅ [SCANNER] Pagina salvata: ${route.component}`);
          this.reportProgress(
            25 + Math.floor((pagesScanned / routes.length) * 25),
            `📄 Pagina ${pagesScanned}/${routes.length}: ${route.component}`
          );
        } else {
          console.error(`❌ [SCANNER] Errore salvataggio pagina ${route.component}:`, error);
        }
      } catch (err) {
        console.error(`❌ [SCANNER] Errore scansione pagina ${route.component}:`, err);
      }
    }

    console.log(`🎯 [SCANNER] Totale pagine scansionate: ${pagesScanned}`);
    return { pagesScanned };
  }

  /**
   * Scan all components from src/components
   */
  private async scanComponents(): Promise<{ componentsExtracted: number; thumbnailsGenerated: number }> {
    let componentsExtracted = 0;
    let thumbnailsGenerated = 0;
    const componentFiles = this.project.getSourceFiles()
      .filter(file => file.getFilePath().includes('src/components/') && file.getFilePath().endsWith('.tsx'));

    console.log(`🔍 [SCANNER] Scansione di ${componentFiles.length} file componenti...`);

    for (const file of componentFiles) {
      try {
        const components = this.extractComponentsFromFile(file);
        console.log(`📦 [SCANNER] Estratti ${components.length} componenti da ${file.getBaseName()}`);
        
        for (const component of components) {
          console.log(`💾 [SCANNER] Salvando componente: ${component.component_name}...`);
          
          const { data, error } = await supabase
            .from('design_lab_extracted_components')
            .insert(component)
            .select()
            .single();

          if (!error && data) {
            componentsExtracted++;
            console.log(`✅ [SCANNER] Componente ${component.component_name} salvato con ID: ${data.id}`);
            
            // Generate thumbnail if enabled
            if (this.config.generateThumbnails) {
              try {
                console.log(`📸 [SCANNER] Generazione miniatura per ${component.component_name}...`);
                await generateComponentThumbnail(data.id, component.jsx_code);
                thumbnailsGenerated++;
                console.log(`✅ [SCANNER] Miniatura generata per ${component.component_name}`);
                this.reportProgress(
                  75 + Math.floor((thumbnailsGenerated / componentsExtracted) * 15),
                  `📸 Miniatura ${thumbnailsGenerated}/${componentsExtracted}: ${component.component_name}`
                );
              } catch (thumbError) {
                console.error(`❌ [SCANNER] Errore generazione miniatura per ${component.component_name}:`, thumbError);
                this.reportProgress(
                  75 + Math.floor((thumbnailsGenerated / componentsExtracted) * 15),
                  `⚠️ Miniatura fallita: ${component.component_name}`
                );
              }
            }
          } else {
            console.error(`❌ [SCANNER] Errore salvataggio componente ${component.component_name}:`, error);
          }
        }
      } catch (err) {
        console.error(`❌ [SCANNER] Errore scansione file ${file.getFilePath()}:`, err);
      }
    }

    console.log(`🎯 [SCANNER] Totale: ${componentsExtracted} componenti estratti, ${thumbnailsGenerated} miniature generate`);
    return { componentsExtracted, thumbnailsGenerated };
  }

  /**
   * Extract components from a single file
   */
  private extractComponentsFromFile(file: SourceFile): Array<any> {
    const components: Array<any> = [];
    const filePath = file.getFilePath().replace(/^.*src\//, 'src/');

    // Find all exported function components
    file.getFunctions().forEach(func => {
      if (!func.isExported()) return;

      const jsxCode = func.getText();
      const componentName = func.getName() || 'Anonymous';
      const dependencies = this.extractDependencies(file);
      const propsSchema = this.extractPropsSchema(func);
      
      // TICKET 2: Auto-generate metadata
      const tags = this.analyzeComponentTags(jsxCode, this.extractFunctionNamesFromCode(jsxCode));
      const fieldsSchema = this.extractFieldsSchema(propsSchema, jsxCode);
      const section = this.detectSection(componentName, jsxCode);
      const compatibilityContext = this.generateCompatibilityContext(filePath, 'function', dependencies);
      const uiCategory = this.categorizeUIComponent(componentName, jsxCode);
      const complexityLevel = this.calculateComplexityLevel(func);

      const componentData = {
        component_name: componentName,
        component_type: 'function',
        jsx_code: jsxCode,
        dependencies,
        props_schema: propsSchema,
        position_in_source: {
          file: filePath,
          line: func.getStartLineNumber(),
        },
        is_reusable: this.isReusable(func),
        // New fields from TICKET 2
        tags,
        fields_schema: fieldsSchema,
        section,
        compatibility_context: compatibilityContext,
        ui_category: uiCategory,
        complexity_level: complexityLevel,
      };

      components.push(componentData);
    });

    // Find all exported const components
    file.getVariableDeclarations().forEach(varDecl => {
      const statement = varDecl.getVariableStatement();
      if (!statement?.isExported()) return;

      const initializer = varDecl.getInitializer();
      if (!initializer || !initializer.getText().includes('=>')) return;

      const jsxCode = varDecl.getText();
      const componentName = varDecl.getName();
      const dependencies = this.extractDependencies(file);
      const propsSchema = this.extractPropsSchemaFromVariable(varDecl);
      
      // TICKET 2: Auto-generate metadata
      const tags = this.analyzeComponentTags(jsxCode, this.extractFunctionNamesFromCode(jsxCode));
      const fieldsSchema = this.extractFieldsSchema(propsSchema, jsxCode);
      const section = this.detectSection(componentName, jsxCode);
      const compatibilityContext = this.generateCompatibilityContext(filePath, 'const', dependencies);
      const uiCategory = this.categorizeUIComponent(componentName, jsxCode);
      const complexityLevel = this.calculateComplexityLevel(varDecl);

      const componentData = {
        component_name: componentName,
        component_type: 'const',
        jsx_code: jsxCode,
        dependencies,
        props_schema: propsSchema,
        position_in_source: {
          file: filePath,
          line: varDecl.getStartLineNumber(),
        },
        is_reusable: true,
        // New fields from TICKET 2
        tags,
        fields_schema: fieldsSchema,
        section,
        compatibility_context: compatibilityContext,
        ui_category: uiCategory,
        complexity_level: complexityLevel,
      };

      components.push(componentData);
    });

    return components;
  }

  /**
   * Scan all utility functions
   */
  private async scanFunctions(): Promise<{ functionsExtracted: number }> {
    let functionsExtracted = 0;
    const sourceFiles = this.project.getSourceFiles()
      .filter(file => !file.getFilePath().includes('.test.') && !file.getFilePath().includes('node_modules'));

    console.log(`⚙️ [SCANNER] Scansione funzioni da ${sourceFiles.length} file...`);

    for (const file of sourceFiles) {
      try {
        const functions = this.extractFunctionsFromFile(file);
        
        if (functions.length > 0) {
          console.log(`🔧 [SCANNER] Estratte ${functions.length} funzioni da ${file.getBaseName()}`);
        }
        
        for (const func of functions) {
          const { error } = await supabase
            .from('design_lab_extracted_functions')
            .insert(func);

          if (!error) {
            functionsExtracted++;
            this.reportProgress(
              90 + Math.floor((functionsExtracted / (functions.length || 1)) * 10),
              `⚙️ Funzione ${functionsExtracted}: ${func.function_name}`
            );
          } else {
            console.error(`❌ [SCANNER] Errore salvataggio funzione ${func.function_name}:`, error);
          }
        }
      } catch (err) {
        console.error(`❌ [SCANNER] Errore scansione funzioni in ${file.getFilePath()}:`, err);
      }
    }

    console.log(`🎯 [SCANNER] Totale funzioni estratte: ${functionsExtracted}`);
    return { functionsExtracted };
  }

  /**
   * Extract functions from a single file
   */
  private extractFunctionsFromFile(file: SourceFile): Array<any> {
    const functions: Array<any> = [];
    const filePath = file.getFilePath().replace(/^.*src\//, 'src/');

    file.getFunctions().forEach(func => {
      if (!func.isExported()) return;

      const code = func.getText();
      const functionName = func.getName() || 'anonymous';
      const eventHandlers = this.extractEventHandlers(func);
      
      // TICKET 2: Auto-generate function metadata
      const tags = this.analyzeFunctionTags(functionName, code, eventHandlers);
      const applicableTo = this.determineApplicableTo(functionName, code);
      const compatibleContexts = this.determineCompatibleContexts(filePath, code);

      const functionData = {
        function_name: functionName,
        function_type: 'function',
        description: this.extractJsDoc(func),
        code_original: code,
        code_generic: this.genericizeCode(code),
        dependencies: this.extractDependencies(file),
        parameters: this.extractParameters(func),
        return_type: func.getReturnType().getText(),
        is_async: func.isAsync(),
        complexity_score: this.calculateFunctionComplexity(func),
        event_handlers: eventHandlers,
        // New fields from TICKET 2
        tags,
        applicable_to: applicableTo,
        compatible_contexts: compatibleContexts,
      };

      functions.push(functionData);
    });

    return functions;
  }

  // ========== HELPER METHODS ==========

  private findComponentFile(componentName: string): SourceFile | undefined {
    return this.project.getSourceFiles().find(file => 
      file.getFilePath().includes(`${componentName}.tsx`) || 
      file.getFilePath().endsWith(`/${componentName}.tsx`)
    );
  }

  private extractDescription(file: SourceFile): string {
    const comments = file.getLeadingCommentRanges();
    if (comments.length === 0) return '';
    return file.getFullText().substring(comments[0].getPos(), comments[0].getEnd()).trim();
  }

  private countComponentsInFile(file: SourceFile): number {
    return file.getFunctions().filter(f => f.isExported()).length +
           file.getVariableDeclarations().filter(v => v.getVariableStatement()?.isExported()).length;
  }

  private countFunctionsInFile(file: SourceFile): number {
    return file.getFunctions().length;
  }

  private calculateComplexity(file: SourceFile): number {
    let complexity = 0;
    file.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.IfStatement) complexity += 1;
      if (node.getKind() === SyntaxKind.ForStatement) complexity += 2;
      if (node.getKind() === SyntaxKind.WhileStatement) complexity += 2;
      if (node.getKind() === SyntaxKind.ConditionalExpression) complexity += 1;
    });
    return complexity;
  }

  private extractDependencies(file: SourceFile): string[] {
    return file.getImportDeclarations().map(imp => {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      return moduleSpecifier;
    });
  }

  private extractPropsSchema(func: FunctionDeclaration): Record<string, any> {
    const params = func.getParameters();
    if (params.length === 0) return {};

    const propsParam = params[0];
    const type = propsParam.getType();
    
    return {
      type: type.getText(),
      properties: type.getProperties().map(prop => ({
        name: prop.getName(),
        type: prop.getValueDeclaration()?.getType().getText() || 'any',
      })),
    };
  }

  private extractPropsSchemaFromVariable(varDecl: VariableDeclaration): Record<string, any> {
    const type = varDecl.getType();
    return {
      type: type.getText(),
    };
  }

  private isReusable(func: FunctionDeclaration): boolean {
    const text = func.getText();
    // Component is reusable if it doesn't use global state or specific IDs
    return !text.includes('useParams()') && 
           !text.includes('window.location') &&
           text.includes('Props');
  }

  private extractJsDoc(func: FunctionDeclaration): string {
    const jsDocs = func.getJsDocs();
    if (jsDocs.length === 0) return '';
    return jsDocs[0].getDescription().trim();
  }

  private genericizeCode(code: string): string {
    // Remove specific values and replace with placeholders
    return code
      .replace(/['"][\w-]+@[\w.-]+['"]/g, '"user@example.com"')
      .replace(/\d{10,}/g, '1234567890')
      .replace(/uuid-\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g, 'uuid-placeholder');
  }

  private extractParameters(func: FunctionDeclaration): Record<string, any> {
    const params = func.getParameters();
    return params.reduce((acc, param) => {
      acc[param.getName()] = {
        type: param.getType().getText(),
        optional: param.isOptional(),
      };
      return acc;
    }, {} as Record<string, any>);
  }

  private calculateFunctionComplexity(func: FunctionDeclaration): number {
    let complexity = 1;
    func.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.IfStatement) complexity += 1;
      if (node.getKind() === SyntaxKind.ForStatement) complexity += 2;
      if (node.getKind() === SyntaxKind.SwitchStatement) complexity += 1;
    });
    return complexity;
  }

  private extractEventHandlers(func: FunctionDeclaration): string[] {
    const handlers: string[] = [];
    func.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.JsxAttribute) {
        const attr = node.asKind(SyntaxKind.JsxAttribute);
        const nameNode = attr?.getNameNode();
        const name = nameNode?.getText();
        if (name && name.startsWith('on')) {
          handlers.push(name);
        }
      }
    });
    return [...new Set(handlers)];
  }

  /**
   * Progress reporting
   */
  onProgress(callback: (progress: number, task: string) => void): void {
    this.progressCallback = callback;
  }

  private reportProgress(progress: number, task: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, task);
    }
  }

  // ========== TICKET 2: INTELLIGENCE METHODS ==========

  /**
   * Analyze component code and generate semantic tags
   */
  private analyzeComponentTags(jsxCode: string, functionNames: string[]): string[] {
    const tags: string[] = [];
    
    // JSX pattern analysis
    if (jsxCode.includes('onSubmit') || jsxCode.includes('handleSubmit')) tags.push('form-submit');
    if (jsxCode.includes('useState') || jsxCode.includes('useForm')) tags.push('stateful');
    if (jsxCode.includes('fetch') || jsxCode.includes('axios') || jsxCode.includes('supabase')) tags.push('api-call');
    if (jsxCode.includes('map(') && jsxCode.includes('<tr')) tags.push('data-table');
    if (jsxCode.includes('map(') && jsxCode.includes('<Card')) tags.push('data-grid');
    if (jsxCode.includes('useEffect')) tags.push('lifecycle');
    if (jsxCode.includes('validation') || jsxCode.includes('zod') || jsxCode.includes('yup')) tags.push('validation');
    if (jsxCode.includes('Modal') || jsxCode.includes('Dialog')) tags.push('modal');
    if (jsxCode.includes('useNavigate') || jsxCode.includes('Link')) tags.push('navigation');
    if (jsxCode.includes('toast') || jsxCode.includes('Toast')) tags.push('notification');
    if (jsxCode.includes('<Input') || jsxCode.includes('<Textarea') || jsxCode.includes('<Select')) tags.push('form-input');
    if (jsxCode.includes('useQuery') || jsxCode.includes('useMutation')) tags.push('react-query');
    if (jsxCode.includes('Drag') || jsxCode.includes('Drop') || jsxCode.includes('dnd')) tags.push('drag-drop');
    
    // Function name analysis
    functionNames.forEach(fn => {
      const lower = fn.toLowerCase();
      if (lower.includes('validate')) tags.push('validation');
      if (lower.includes('delete') || lower.includes('remove')) tags.push('delete-action');
      if (lower.includes('create') || lower.includes('add')) tags.push('create-action');
      if (lower.includes('update') || lower.includes('edit')) tags.push('update-action');
      if (lower.includes('export')) tags.push('export-data');
      if (lower.includes('import')) tags.push('import-data');
      if (lower.includes('search') || lower.includes('filter')) tags.push('search-filter');
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Analyze function code and generate semantic tags
   */
  private analyzeFunctionTags(functionName: string, code: string, eventHandlers: string[]): string[] {
    const tags: string[] = [];
    const lower = functionName.toLowerCase();
    
    // Event handler detection
    if (eventHandlers.length > 0 || lower.includes('handle') || lower.includes('on')) {
      tags.push('event-handler');
    }
    
    // Action type detection
    if (lower.includes('validate')) tags.push('validation');
    if (lower.includes('delete') || lower.includes('remove')) tags.push('delete-action');
    if (lower.includes('create') || lower.includes('add') || lower.includes('insert')) tags.push('create-action');
    if (lower.includes('update') || lower.includes('edit') || lower.includes('modify')) tags.push('update-action');
    if (lower.includes('fetch') || lower.includes('get') || lower.includes('load')) tags.push('data-fetch');
    if (lower.includes('export')) tags.push('export-data');
    if (lower.includes('import')) tags.push('import-data');
    if (lower.includes('transform') || lower.includes('map') || lower.includes('format')) tags.push('data-transform');
    
    // Code pattern analysis
    if (code.includes('supabase.') || code.includes('fetch(') || code.includes('axios.')) tags.push('api-call');
    if (code.includes('localStorage') || code.includes('sessionStorage')) tags.push('storage');
    if (code.includes('JSON.parse') || code.includes('JSON.stringify')) tags.push('json-processing');
    if (code.includes('async') && code.includes('await')) tags.push('async-operation');
    
    return [...new Set(tags)];
  }

  /**
   * Extract fields schema from props and JSX code
   */
  private extractFieldsSchema(propsSchema: Record<string, any>, jsxCode: string): any[] {
    const fields: any[] = [];
    
    if (!propsSchema.properties) return fields;
    
    propsSchema.properties.forEach((prop: any) => {
      // Try to find label and placeholder in JSX
      const labelPattern = new RegExp(`label\\s*=\\s*["']([^"']+)["'][^>]*${prop.name}`, 'i');
      const placeholderPattern = new RegExp(`placeholder\\s*=\\s*["']([^"']+)["'][^>]*${prop.name}`, 'i');
      const requiredPattern = new RegExp(`required[^>]*${prop.name}`, 'i');
      
      const labelMatch = jsxCode.match(labelPattern);
      const placeholderMatch = jsxCode.match(placeholderPattern);
      const isRequired = requiredPattern.test(jsxCode);
      
      fields.push({
        name: prop.name,
        type: this.normalizeFieldType(prop.type),
        label: labelMatch ? labelMatch[1] : this.humanizeName(prop.name),
        placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
        required: isRequired,
      });
    });
    
    return fields;
  }

  /**
   * Detect section of the page based on component name and JSX
   */
  private detectSection(componentName: string, jsxCode: string): string {
    const lower = componentName.toLowerCase();
    
    if (lower.includes('header') || jsxCode.includes('<header')) return 'Header';
    if (lower.includes('sidebar') || lower.includes('aside') || jsxCode.includes('<aside')) return 'Sidebar';
    if (lower.includes('footer') || jsxCode.includes('<footer')) return 'Footer';
    if (lower.includes('nav') || lower.includes('navigation')) return 'Navigation';
    if (lower.includes('form')) return 'Form';
    if (lower.includes('table') || lower.includes('list') || lower.includes('grid')) return 'Data Display';
    if (lower.includes('card')) return 'Card';
    if (lower.includes('modal') || lower.includes('dialog')) return 'Modal';
    if (lower.includes('toolbar') || lower.includes('actions')) return 'Actions';
    
    return 'Main Content';
  }

  /**
   * Generate compatibility context metadata
   */
  private generateCompatibilityContext(filePath: string, componentType: string, dependencies: string[]): any {
    // Detect domain from file path
    let domain = 'General';
    if (filePath.includes('/rubrica/') || filePath.includes('/attivita/')) domain = 'Commercial';
    if (filePath.includes('/email/')) domain = 'Email';
    if (filePath.includes('/chat/')) domain = 'Chat';
    if (filePath.includes('/admin/') || filePath.includes('/config/')) domain = 'Admin';
    if (filePath.includes('/intranet/')) domain = 'Intranet';
    if (filePath.includes('/import/')) domain = 'Import';
    if (filePath.includes('/design-lab/')) domain = 'DesignLab';
    
    return {
      domain,
      page_context: filePath.split('/').slice(-2, -1)[0] || 'unknown',
      requires_auth: dependencies.some(d => 
        d.includes('auth') || 
        d.includes('user') || 
        d.includes('session')
      ),
      requires_database: dependencies.some(d => 
        d.includes('supabase') || 
        d.includes('query') || 
        d.includes('prisma')
      ),
      ui_framework: 'shadcn',
      component_family: componentType,
    };
  }

  /**
   * Categorize UI component type
   */
  private categorizeUIComponent(componentName: string, jsxCode: string): string {
    const lower = componentName.toLowerCase();
    
    if (lower.includes('form') || jsxCode.includes('<Form')) return 'Form';
    if (lower.includes('table') || jsxCode.includes('<Table')) return 'Table';
    if (lower.includes('card') || jsxCode.includes('<Card')) return 'Card';
    if (lower.includes('list')) return 'List';
    if (lower.includes('modal') || lower.includes('dialog')) return 'Modal';
    if (lower.includes('button')) return 'Button';
    if (lower.includes('input') || lower.includes('select') || lower.includes('textarea')) return 'Input';
    if (lower.includes('nav') || lower.includes('menu')) return 'Navigation';
    if (lower.includes('chart') || lower.includes('graph')) return 'Visualization';
    if (lower.includes('layout') || lower.includes('container')) return 'Layout';
    
    return 'Component';
  }

  /**
   * Calculate complexity level for a component
   */
  private calculateComplexityLevel(node: FunctionDeclaration | VariableDeclaration): string {
    const code = node.getText();
    let score = 0;
    
    // Count hooks
    const hooksCount = (code.match(/use[A-Z]\w+/g) || []).length;
    score += hooksCount * 2;
    
    // Count conditional logic
    score += (code.match(/\bif\b/g) || []).length;
    score += (code.match(/\?/g) || []).length;
    
    // Count loops
    score += (code.match(/\bmap\b/g) || []).length;
    score += (code.match(/\bfor\b/g) || []).length * 2;
    
    // Count async operations
    score += (code.match(/\bawait\b/g) || []).length * 2;
    
    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  }

  /**
   * Determine which component types a function is applicable to
   */
  private determineApplicableTo(functionName: string, code: string): string[] {
    const applicable: string[] = [];
    const lower = functionName.toLowerCase();
    
    // Input-related functions
    if (lower.includes('validate') || lower.includes('change') || lower.includes('input')) {
      applicable.push('input', 'textarea', 'select');
    }
    
    // Click handlers
    if (lower.includes('click') || lower.includes('submit')) {
      applicable.push('button', 'link');
    }
    
    // Form handlers
    if (lower.includes('form') || lower.includes('submit')) {
      applicable.push('form');
    }
    
    // Table/List handlers
    if (lower.includes('row') || lower.includes('item') || lower.includes('select')) {
      applicable.push('table-row', 'list-item');
    }
    
    // Generic if no specific match
    if (applicable.length === 0 && (lower.includes('handle') || lower.includes('on'))) {
      applicable.push('button', 'input');
    }
    
    return applicable;
  }

  /**
   * Determine compatible contexts for a function
   */
  private determineCompatibleContexts(filePath: string, code: string): string[] {
    const contexts: string[] = [];
    
    // File path based detection
    if (filePath.includes('/form')) contexts.push('form');
    if (filePath.includes('/table')) contexts.push('table');
    if (filePath.includes('/modal')) contexts.push('modal');
    if (filePath.includes('/card')) contexts.push('card');
    
    // Code pattern based detection
    if (code.includes('Form') || code.includes('submit')) contexts.push('form');
    if (code.includes('Table') || code.includes('row')) contexts.push('table');
    if (code.includes('Modal') || code.includes('Dialog')) contexts.push('modal');
    if (code.includes('supabase')) contexts.push('database');
    
    // Generic contexts
    if (contexts.length === 0) {
      contexts.push('general');
    }
    
    return [...new Set(contexts)];
  }

  /**
   * Extract function names from code
   */
  private extractFunctionNamesFromCode(code: string): string[] {
    const functionPattern = /(?:function|const)\s+(\w+)|(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
    const matches = [...code.matchAll(functionPattern)];
    return matches.map(m => m[1] || m[2]).filter(Boolean);
  }

  /**
   * Normalize field type to standard names
   */
  private normalizeFieldType(type: string): string {
    if (type.includes('string')) return 'string';
    if (type.includes('number')) return 'number';
    if (type.includes('boolean')) return 'boolean';
    if (type.includes('Date')) return 'date';
    if (type.includes('[]')) return 'array';
    return 'any';
  }

  /**
   * Convert camelCase to human readable
   */
  private humanizeName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
