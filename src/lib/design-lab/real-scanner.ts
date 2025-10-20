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
      .like('file_path', 'src/%')
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

    for (const route of routes) {
      try {
        const sourceFile = this.findComponentFile(route.component);
        if (!sourceFile) continue;

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

        if (!error) pagesScanned++;
      } catch (err) {
        console.error(`Error scanning page ${route.component}:`, err);
      }
    }

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

    for (const file of componentFiles) {
      try {
        const components = this.extractComponentsFromFile(file);
        
        for (const component of components) {
          const { data, error } = await supabase
            .from('design_lab_extracted_components')
            .insert(component)
            .select()
            .single();

          if (!error && data) {
            componentsExtracted++;
            
            // Generate thumbnail if enabled
            if (this.config.generateThumbnails) {
              try {
                await generateComponentThumbnail(data.id, component.jsx_code);
                thumbnailsGenerated++;
                this.reportProgress(
                  75 + Math.floor((thumbnailsGenerated / componentsExtracted) * 15),
                  `Generata miniatura ${thumbnailsGenerated}/${componentsExtracted}`
                );
              } catch (thumbError) {
                console.warn(`Failed to generate thumbnail for ${data.id}:`, thumbError);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error scanning components in ${file.getFilePath()}:`, err);
      }
    }

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

      const componentData = {
        component_name: func.getName() || 'Anonymous',
        component_type: 'function',
        jsx_code: func.getText(),
        dependencies: this.extractDependencies(file),
        props_schema: this.extractPropsSchema(func),
        position_in_source: {
          file: filePath,
          line: func.getStartLineNumber(),
        },
        is_reusable: this.isReusable(func),
      };

      components.push(componentData);
    });

    // Find all exported const components
    file.getVariableDeclarations().forEach(varDecl => {
      const statement = varDecl.getVariableStatement();
      if (!statement?.isExported()) return;

      const initializer = varDecl.getInitializer();
      if (!initializer || !initializer.getText().includes('=>')) return;

      const componentData = {
        component_name: varDecl.getName(),
        component_type: 'const',
        jsx_code: varDecl.getText(),
        dependencies: this.extractDependencies(file),
        props_schema: this.extractPropsSchemaFromVariable(varDecl),
        position_in_source: {
          file: filePath,
          line: varDecl.getStartLineNumber(),
        },
        is_reusable: true,
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

    for (const file of sourceFiles) {
      try {
        const functions = this.extractFunctionsFromFile(file);
        
        for (const func of functions) {
          const { error } = await supabase
            .from('design_lab_extracted_functions')
            .insert(func);

          if (!error) functionsExtracted++;
        }
      } catch (err) {
        console.error(`Error scanning functions in ${file.getFilePath()}:`, err);
      }
    }

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

      const functionData = {
        function_name: func.getName() || 'anonymous',
        function_type: 'function',
        description: this.extractJsDoc(func),
        code_original: func.getText(),
        code_generic: this.genericizeCode(func.getText()),
        dependencies: this.extractDependencies(file),
        parameters: this.extractParameters(func),
        return_type: func.getReturnType().getText(),
        is_async: func.isAsync(),
        complexity_score: this.calculateFunctionComplexity(func),
        event_handlers: this.extractEventHandlers(func),
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
}
