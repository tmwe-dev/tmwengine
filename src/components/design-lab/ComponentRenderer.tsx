import React, { Suspense, lazy, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ExtractedComponent } from '@/types/design-lab-scanner';

interface ComponentRendererProps {
  component: ExtractedComponent;
  props?: Record<string, any>;
}

/**
 * TICKET 5: Component Preview System
 * Renders real components based on extracted JSX code with fallback strategies
 */
export function ComponentRenderer({ component, props = {} }: ComponentRendererProps) {
  // Strategy 1: Try to render from JSX code using Function constructor
  const renderedComponent = useMemo(() => {
    try {
      // Clean and prepare JSX code
      const jsxCode = component.jsx_code.trim();
      
      // Simple component type detection for common patterns
      if (component.ui_category === 'input' || component.component_type.toLowerCase().includes('input')) {
        return <Input {...props} placeholder={props.placeholder || component.component_name} />;
      }
      
      if (component.ui_category === 'button' || component.component_type.toLowerCase().includes('button')) {
        return <Button {...props}>{props.children || component.component_name}</Button>;
      }
      
      if (component.ui_category === 'card' || component.component_type.toLowerCase().includes('card')) {
        return (
          <Card {...props} className="p-4">
            <div className="text-sm font-medium">{component.component_name}</div>
            {props.children}
          </Card>
        );
      }
      
      if (component.component_type.toLowerCase().includes('checkbox')) {
        return (
          <div className="flex items-center space-x-2">
            <Checkbox {...props} />
            <label className="text-sm">{props.label || component.component_name}</label>
          </div>
        );
      }
      
      if (component.component_type.toLowerCase().includes('textarea')) {
        return <Textarea {...props} placeholder={props.placeholder || component.component_name} />;
      }
      
      if (component.component_type.toLowerCase().includes('badge')) {
        return <Badge {...props}>{props.children || component.component_name}</Badge>;
      }
      
      // Strategy 2: Render from preview_html if available
      if (component.preview_html) {
        return (
          <div 
            dangerouslySetInnerHTML={{ __html: component.preview_html }} 
            className="w-full h-full"
          />
        );
      }
      
      // Strategy 3: Smart fallback based on tags and metadata
      return renderSmartFallback(component, props);
      
    } catch (error) {
      console.error('Error rendering component:', error);
      return renderErrorFallback(component);
    }
  }, [component, props]);

  return (
    <Suspense fallback={<ComponentSkeleton component={component} />}>
      {renderedComponent}
    </Suspense>
  );
}

/**
 * Smart fallback renderer based on component intelligence metadata
 */
function renderSmartFallback(component: ExtractedComponent, props: Record<string, any>) {
  const tags = component.tags || [];
  
  // Form elements
  if (tags.includes('form') || tags.includes('input')) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{component.component_name}</label>
        <Input {...props} />
      </div>
    );
  }
  
  // Data display
  if (tags.includes('data-display') || tags.includes('list')) {
    return (
      <Card className="p-3">
        <div className="text-xs text-muted-foreground mb-1">{component.component_type}</div>
        <div className="text-sm font-medium">{component.component_name}</div>
        {component.fields_schema && (
          <div className="mt-2 text-xs text-muted-foreground">
            {component.fields_schema.length} fields
          </div>
        )}
      </Card>
    );
  }
  
  // Interactive elements
  if (tags.includes('interactive') || tags.includes('button')) {
    return <Button {...props}>{component.component_name}</Button>;
  }
  
  // Layout components
  if (tags.includes('layout') || tags.includes('container')) {
    return (
      <div className="border-2 border-dashed border-border rounded p-4">
        <div className="text-xs text-muted-foreground mb-2">Layout: {component.component_name}</div>
        <div className="bg-muted/30 rounded p-2 text-xs">Content area</div>
      </div>
    );
  }
  
  // Generic fallback with metadata
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{component.component_name}</div>
        {component.ui_category && (
          <Badge variant="secondary" className="text-xs">
            {component.ui_category}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {component.component_type}
      </div>
      {component.complexity_level && (
        <Badge 
          variant={component.complexity_level === 'high' ? 'destructive' : 'outline'} 
          className="text-xs mt-2"
        >
          {component.complexity_level} complexity
        </Badge>
      )}
    </Card>
  );
}

/**
 * Error fallback with helpful information
 */
function renderErrorFallback(component: ExtractedComponent) {
  return (
    <Alert variant="destructive" className="border-dashed">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-xs">
        <div className="font-medium mb-1">Cannot render: {component.component_name}</div>
        <div className="text-muted-foreground">{component.component_type}</div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Loading skeleton for Suspense fallback
 */
function ComponentSkeleton({ component }: { component: ExtractedComponent }) {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded mb-2" />
      <div className="h-4 bg-muted/50 rounded w-3/4" />
    </div>
  );
}
