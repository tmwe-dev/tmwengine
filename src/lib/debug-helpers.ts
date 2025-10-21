// Helper functions for PageDebuggerAudit

/**
 * Maps route paths to page file names
 * Add all your application routes here
 */
export const routeToPageName = (route: string): string => {
  const routeMap: Record<string, string> = {
    '/': 'Index',
    '/rubrica': 'Rubrica',
    '/attivita': 'Attivita',
    '/campagne': 'Campagne',
    '/chat': 'Chat',
    '/chat-laboratory': 'ChatLaboratory',
    '/settings': 'Settings',
    '/email': 'Email',
    '/import': 'Import',
    '/import-template': 'ImportTemplate',
    '/design-lab': 'DesignLab',
    '/design-lab-editor': 'DesignLabEditor',
    '/admin-prompts': 'AdminPrompts',
    '/intranet': 'Intranet',
    '/knowledge-base': 'KnowledgeBase',
    '/analytics': 'Analytics',
    '/profile': 'Profile',
    // Add more routes as needed
  };
  
  return routeMap[route] || route.split('/').pop() || 'Unknown';
};

/**
 * Calculates code complexity score based on control flow structures
 * Higher score = more complex code
 */
export const calculateComplexity = (content: string): number => {
  let score = 0;
  
  // Count if statements
  score += (content.match(/\bif\s*\(/g) || []).length;
  
  // Count for loops
  score += (content.match(/\bfor\s*\(/g) || []).length;
  
  // Count while loops
  score += (content.match(/\bwhile\s*\(/g) || []).length;
  
  // Count switch statements
  score += (content.match(/\bswitch\s*\(/g) || []).length;
  
  // Count ternary operators
  score += (content.match(/\?[^:]*:/g) || []).length;
  
  // Count try-catch blocks
  score += (content.match(/\btry\s*\{/g) || []).length;
  
  // Count async/await (adds complexity)
  score += (content.match(/\basync\s+/g) || []).length;
  
  return score;
};
