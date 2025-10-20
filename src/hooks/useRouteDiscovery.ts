import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiscoveredRoute {
  path: string;
  name: string;
  category: string;
}

export const useRouteDiscovery = () => {
  return useQuery({
    queryKey: ['route-discovery'],
    queryFn: async () => {
      // Fetch App.tsx from code_index
      const { data: appFile, error } = await supabase
        .from('code_index')
        .select('content')
        .eq('file_path', 'src/App.tsx')
        .single();

      if (error || !appFile) {
        console.error('Error fetching App.tsx from code_index:', error);
        return [];
      }

      // Extract all <Route> declarations
      const routeRegex = /<Route\s+path="([^"]+)"\s+element={<(\w+)\s*\/?>}/g;
      const routes: DiscoveredRoute[] = [];
      let match;

      while ((match = routeRegex.exec(appFile.content)) !== null) {
        const [, path, componentName] = match;
        
        // Skip auth, callback, and wildcard routes
        if (
          path === '/login' || 
          path === '/auth/callback' || 
          path === '*' ||
          path.includes(':') // Skip parametric routes for now
        ) {
          continue;
        }

        routes.push({
          path,
          name: componentName,
          category: categorizeRoute(path, componentName),
        });
      }

      return routes;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

function categorizeRoute(path: string, name: string): string {
  // Commercial & CRM
  if (path.includes('rubrica') || path.includes('attivita')) {
    return 'Commercial & CRM';
  }
  
  // Email Management
  if (path.includes('email') || path.includes('campagne')) {
    return 'Email Management';
  }
  
  // Chat & AI
  if (path.includes('chat') || path.includes('radio-chat') || path.includes('laboratory')) {
    return 'Chat & AI';
  }
  
  // Design Lab
  if (path.includes('design-lab')) {
    return 'Design Lab';
  }
  
  // Intranet
  if (path.includes('intranet')) {
    return 'Intranet';
  }
  
  // Admin & Config
  if (
    path.includes('admin') || 
    path.includes('config') || 
    path.includes('settings') ||
    path.includes('tables') ||
    path.includes('code-') ||
    path.includes('edge-function')
  ) {
    return 'Admin & Config';
  }
  
  // Data Import
  if (path.includes('import') || path.includes('gestisci')) {
    return 'Data Import';
  }
  
  // TMWE & Auth
  if (path.includes('tmwe') || path.includes('oauth')) {
    return 'TMWE & Auth';
  }
  
  // Utility & Others
  if (
    path.includes('language') || 
    path.includes('guide') || 
    path.includes('template') ||
    path.includes('review')
  ) {
    return 'Utility & Tools';
  }
  
  return 'Other';
}
