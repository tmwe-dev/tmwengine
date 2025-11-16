import { LucideIcon } from 'lucide-react';
import { 
  BarChart3, Mail, MessageSquare, Upload, Settings, 
  Code, Phone, BookOpen, Sparkles, Database, Shield,
  FileText, Calendar, Radio, Bot, Palette, Brain,
  Users, Activity, Megaphone, Inbox, FolderOpen,
  Tag, Filter, TestTube, GitCompare, Mic, Languages,
  LayoutDashboard, Wrench, Map, Globe, Server,
  FlaskConical, Layers, Eye, Workflow, Bell
} from 'lucide-react';

export interface PageInfo {
  title: string;
  path: string;
  description: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

export interface PageGroup {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  pages: PageInfo[];
}

export const siteMapGroups: PageGroup[] = [
  {
    id: 'commercial',
    name: 'Commercial & CRM',
    description: 'Gestión de contactos, actividades y campañas comerciales',
    icon: BarChart3,
    color: 'blue',
    pages: [
      {
        title: 'Libreta de Direcciones',
        path: '/rubrica',
        description: 'Gestión completa de contactos y clientes del sistema',
        icon: BookOpen,
        requiresAuth: true
      },
      {
        title: 'Libreta Avanzada',
        path: '/rubrica-avanzata',
        description: 'Gestión avanzada con filtros, segmentación y análisis',
        icon: Users,
        requiresAuth: true
      },
      {
        title: 'Actividades',
        path: '/attivita',
        description: 'Registro y seguimiento de actividades comerciales',
        icon: Calendar,
        requiresAuth: true
      },
      {
        title: 'Campañas',
        path: '/campagne',
        description: 'Gestión de campañas de marketing y ventas',
        icon: Megaphone,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'chat-ai',
    name: 'Chat & AI',
    description: 'Herramientas de comunicación y asistentes de inteligencia artificial',
    icon: MessageSquare,
    color: 'purple',
    pages: [
      {
        title: 'Chat General',
        path: '/chat',
        description: 'Chat general con asistente IA para múltiples propósitos',
        icon: MessageSquare,
        requiresAuth: true
      },
      {
        title: 'Chat Laboratory',
        path: '/chat-laboratory',
        description: 'Laboratorio experimental para probar diferentes modelos de IA',
        icon: Sparkles,
        requiresAuth: true
      },
      {
        title: 'Radio Chat',
        path: '/radio-chat',
        description: 'Chat con comunicación por voz y audio en tiempo real',
        icon: Radio,
        requiresAuth: true
      },
      {
        title: 'Chat Intranet',
        path: '/chat-intranet',
        description: 'Sistema de mensajería interna para equipos',
        icon: Users,
        requiresAuth: true
      },
      {
        title: 'Brain AI',
        path: '/brain-ai',
        description: 'Sistema de análisis inteligente con múltiples agentes',
        icon: Brain,
        requiresAuth: true
      },
      {
        title: 'Agent Composer',
        path: '/agent-composer',
        description: 'Composición y configuración de agentes IA personalizados',
        icon: Bot,
        requiresAuth: true
      },
      {
        title: 'Prompt Library',
        path: '/prompt-library',
        description: 'Biblioteca de prompts reutilizables para IA',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Knowledge Base',
        path: '/knowledge-base',
        description: 'Base de conocimientos para entrenamiento de IA',
        icon: Database,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'email',
    name: 'Email Management',
    description: 'Sistema completo de gestión y análisis de correos electrónicos',
    icon: Mail,
    color: 'green',
    pages: [
      {
        title: 'Email Dashboard',
        path: '/',
        description: 'Panel principal de gestión de emails con estadísticas',
        icon: LayoutDashboard,
        requiresAuth: true
      },
      {
        title: 'FunnEmail',
        path: '/funnemail',
        description: 'Análisis avanzado de emails con categorización inteligente',
        icon: Mail,
        requiresAuth: true
      },
      {
        title: 'Email Sync Test',
        path: '/email-sync-test',
        description: 'Pruebas de sincronización de correos electrónicos',
        icon: TestTube,
        requiresAuth: true
      },
      {
        title: 'Email Folders',
        path: '/email-folders',
        description: 'Organización y gestión de carpetas de email',
        icon: FolderOpen,
        requiresAuth: true
      },
      {
        title: 'Email Sender Groups',
        path: '/email-sender-groups',
        description: 'Agrupación y categorización de remitentes',
        icon: Tag,
        requiresAuth: true
      },
      {
        title: 'Email Classifier',
        path: '/email-classifier',
        description: 'Clasificación automática de emails con IA',
        icon: Filter,
        requiresAuth: true
      },
      {
        title: 'Email Templates',
        path: '/email-templates',
        description: 'Plantillas reutilizables para respuestas rápidas',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Email Analytics',
        path: '/email-analytics',
        description: 'Análisis y métricas de actividad de email',
        icon: BarChart3,
        requiresAuth: true
      },
      {
        title: 'Inbox Management',
        path: '/inbox-management',
        description: 'Gestión avanzada de bandeja de entrada',
        icon: Inbox,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'import-export',
    name: 'Import & Export',
    description: 'Herramientas para importar y exportar datos del sistema',
    icon: Upload,
    color: 'orange',
    pages: [
      {
        title: 'Import Contacts',
        path: '/import-contacts',
        description: 'Importación masiva de contactos desde archivos',
        icon: Upload,
        requiresAuth: true
      },
      {
        title: 'Export Data',
        path: '/export-data',
        description: 'Exportación de datos en múltiples formatos',
        icon: Database,
        requiresAuth: true
      },
      {
        title: 'CSV Import',
        path: '/csv-import',
        description: 'Importación especializada de archivos CSV',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Data Mapping',
        path: '/data-mapping',
        description: 'Mapeo de campos para importación personalizada',
        icon: Layers,
        requiresAuth: true
      },
      {
        title: 'Import History',
        path: '/import-history',
        description: 'Historial de importaciones realizadas',
        icon: Activity,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'settings',
    name: 'Configuration & Settings',
    description: 'Configuración general del sistema y preferencias',
    icon: Settings,
    color: 'gray',
    pages: [
      {
        title: 'General Settings',
        path: '/settings',
        description: 'Configuración general del sistema',
        icon: Settings,
        requiresAuth: true
      },
      {
        title: 'AI Configuration',
        path: '/config-ai',
        description: 'Configuración de modelos y APIs de inteligencia artificial',
        icon: Bot,
        requiresAuth: true
      },
      {
        title: 'User Profile',
        path: '/profile',
        description: 'Configuración de perfil de usuario',
        icon: Users,
        requiresAuth: true
      },
      {
        title: 'Notifications',
        path: '/notifications',
        description: 'Gestión de notificaciones y alertas',
        icon: Bell,
        requiresAuth: true
      },
      {
        title: 'Language Manager',
        path: '/language-manager',
        description: 'Gestión de idiomas y traducciones del sistema',
        icon: Languages,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'dev-tools',
    name: 'Development & Admin Tools',
    description: 'Herramientas de desarrollo, testing y administración',
    icon: Code,
    color: 'red',
    pages: [
      {
        title: 'Design Lab',
        path: '/design-lab',
        description: 'Laboratorio de diseño para prototipos y componentes',
        icon: Palette,
        requiresAuth: true
      },
      {
        title: 'API Comparison',
        path: '/api-comparison',
        description: 'Comparación de diferentes APIs y modelos de IA',
        icon: GitCompare,
        requiresAuth: true
      },
      {
        title: 'Database Inspector',
        path: '/database-inspector',
        description: 'Inspección y análisis de base de datos',
        icon: Database,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'API Logs',
        path: '/api-logs',
        description: 'Visualización de logs de API y errores',
        icon: FileText,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'System Monitor',
        path: '/system-monitor',
        description: 'Monitoreo de rendimiento y recursos del sistema',
        icon: Activity,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Testing Playground',
        path: '/testing-playground',
        description: 'Entorno de pruebas para nuevas funcionalidades',
        icon: FlaskConical,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Debug Console',
        path: '/debug-console',
        description: 'Consola de depuración en tiempo real',
        icon: Code,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Admin Intranet',
        path: '/intranet-admin',
        description: 'Panel de administración de intranet',
        icon: Shield,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'User Management',
        path: '/user-management',
        description: 'Gestión de usuarios y permisos',
        icon: Users,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Workflow Designer',
        path: '/workflow-designer',
        description: 'Diseñador visual de flujos de trabajo automatizados',
        icon: Workflow,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Edge Functions Monitor',
        path: '/edge-functions-monitor',
        description: 'Monitoreo de funciones serverless',
        icon: Server,
        requiresAuth: true,
        requiresAdmin: true
      }
    ]
  },
  {
    id: 'communications',
    name: 'Communications & Calls',
    description: 'Sistema de llamadas y comunicaciones en tiempo real',
    icon: Phone,
    color: 'cyan',
    pages: [
      {
        title: 'Call Center',
        path: '/call-center',
        description: 'Centro de llamadas con WebRTC',
        icon: Phone,
        requiresAuth: true
      },
      {
        title: 'Call History',
        path: '/call-history',
        description: 'Historial y grabaciones de llamadas',
        icon: Activity,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'utilities',
    name: 'Utilities & Documentation',
    description: 'Utilidades generales y documentación del sistema',
    icon: Wrench,
    color: 'yellow',
    pages: [
      {
        title: 'User Guide',
        path: '/user-guide',
        description: 'Guía completa de usuario del sistema',
        icon: BookOpen,
        requiresAuth: true
      },
      {
        title: 'API Documentation',
        path: '/api-docs',
        description: 'Documentación técnica de APIs disponibles',
        icon: Code,
        requiresAuth: true
      }
    ]
  }
];

export const getTotalPages = () => {
  return siteMapGroups.reduce((total, group) => total + group.pages.length, 0);
};

export const getTotalGroups = () => {
  return siteMapGroups.length;
};

export const searchPages = (query: string): PageInfo[] => {
  const lowerQuery = query.toLowerCase();
  const results: PageInfo[] = [];
  
  siteMapGroups.forEach(group => {
    group.pages.forEach(page => {
      if (
        page.title.toLowerCase().includes(lowerQuery) ||
        page.description.toLowerCase().includes(lowerQuery) ||
        page.path.toLowerCase().includes(lowerQuery)
      ) {
        results.push(page);
      }
    });
  });
  
  return results;
};
