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
    name: 'Commerciale & CRM',
    description: 'Gestione di contatti, attività e campagne commerciali',
    icon: BarChart3,
    color: 'blue',
    pages: [
      {
        title: 'Rubrica',
        path: '/rubrica',
        description: 'Gestione completa di contatti e clienti del sistema',
        icon: BookOpen,
        requiresAuth: true
      },
      {
        title: 'Rubrica Avanzata',
        path: '/rubrica-avanzata',
        description: 'Gestione avanzata con filtri, segmentazione e analisi',
        icon: Users,
        requiresAuth: true
      },
      {
        title: 'Attività',
        path: '/attivita',
        description: 'Registrazione e monitoraggio delle attività commerciali',
        icon: Calendar,
        requiresAuth: true
      },
      {
        title: 'Campagne',
        path: '/campagne',
        description: 'Gestione di campagne di marketing e vendite',
        icon: Megaphone,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'chat-ai',
    name: 'Chat & AI',
    description: 'Strumenti di comunicazione e assistenti di intelligenza artificiale',
    icon: MessageSquare,
    color: 'purple',
    pages: [
      {
        title: 'Chat Generale',
        path: '/chat',
        description: 'Chat generale con assistente IA per molteplici scopi',
        icon: MessageSquare,
        requiresAuth: true
      },
      {
        title: 'Chat Laboratory',
        path: '/chat-laboratory',
        description: 'Laboratorio sperimentale per testare diversi modelli di IA',
        icon: Sparkles,
        requiresAuth: true
      },
      {
        title: 'Radio Chat',
        path: '/radio-chat',
        description: 'Chat con comunicazione vocale e audio in tempo reale',
        icon: Radio,
        requiresAuth: true
      },
      {
        title: 'Chat Intranet',
        path: '/chat-intranet',
        description: 'Sistema di messaggistica interna per team',
        icon: Users,
        requiresAuth: true
      },
      {
        title: 'Brain AI',
        path: '/brain-ai',
        description: 'Sistema di analisi intelligente con agenti multipli',
        icon: Brain,
        requiresAuth: true
      },
      {
        title: 'Agent Composer',
        path: '/agent-composer',
        description: 'Composizione e configurazione di agenti IA personalizzati',
        icon: Bot,
        requiresAuth: true
      },
      {
        title: 'Prompt Library',
        path: '/prompt-library',
        description: 'Libreria di prompt riutilizzabili per IA',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Knowledge Base',
        path: '/knowledge-base',
        description: 'Base di conoscenza per addestramento IA',
        icon: Database,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'email',
    name: 'Gestione Email',
    description: 'Sistema completo di gestione e analisi delle email',
    icon: Mail,
    color: 'green',
    pages: [
      {
        title: 'Dashboard Email',
        path: '/',
        description: 'Pannello principale di gestione email con statistiche',
        icon: LayoutDashboard,
        requiresAuth: true
      },
      {
        title: 'FunnEmail',
        path: '/funnemail',
        description: 'Analisi avanzata di email con categorizzazione intelligente',
        icon: Mail,
        requiresAuth: true
      },
      {
        title: 'Test Sincronizzazione Email',
        path: '/email-sync-test',
        description: 'Test di sincronizzazione delle email',
        icon: TestTube,
        requiresAuth: true
      },
      {
        title: 'Cartelle Email',
        path: '/email-folders',
        description: 'Organizzazione e gestione delle cartelle email',
        icon: FolderOpen,
        requiresAuth: true
      },
      {
        title: 'Gruppi Mittenti',
        path: '/email-sender-groups',
        description: 'Raggruppamento e categorizzazione dei mittenti',
        icon: Tag,
        requiresAuth: true
      },
      {
        title: 'Classificatore Email',
        path: '/email-classifier',
        description: 'Classificazione automatica delle email con IA',
        icon: Filter,
        requiresAuth: true
      },
      {
        title: 'Template Email',
        path: '/email-templates',
        description: 'Template riutilizzabili per risposte rapide',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Analisi Email',
        path: '/email-analytics',
        description: 'Analisi e metriche di attività email',
        icon: BarChart3,
        requiresAuth: true
      },
      {
        title: 'Gestione Posta in Arrivo',
        path: '/inbox-management',
        description: 'Gestione avanzata della casella di posta',
        icon: Inbox,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'import-export',
    name: 'Import & Export',
    description: 'Strumenti per importare ed esportare dati del sistema',
    icon: Upload,
    color: 'orange',
    pages: [
      {
        title: 'Importa Contatti',
        path: '/import-contacts',
        description: 'Importazione massiva di contatti da file',
        icon: Upload,
        requiresAuth: true
      },
      {
        title: 'Esporta Dati',
        path: '/export-data',
        description: 'Esportazione di dati in formati multipli',
        icon: Database,
        requiresAuth: true
      },
      {
        title: 'Importa CSV',
        path: '/csv-import',
        description: 'Importazione specializzata di file CSV',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Mappatura Dati',
        path: '/data-mapping',
        description: 'Mappatura campi per importazione personalizzata',
        icon: Layers,
        requiresAuth: true
      },
      {
        title: 'Storico Import',
        path: '/import-history',
        description: 'Cronologia delle importazioni effettuate',
        icon: Activity,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'settings',
    name: 'Configurazione & Impostazioni',
    description: 'Configurazione generale del sistema e preferenze',
    icon: Settings,
    color: 'gray',
    pages: [
      {
        title: 'Impostazioni Generali',
        path: '/settings',
        description: 'Configurazione generale del sistema',
        icon: Settings,
        requiresAuth: true
      },
      {
        title: 'Configurazione AI',
        path: '/config-ai',
        description: 'Configurazione di modelli e API di intelligenza artificiale',
        icon: Bot,
        requiresAuth: true
      },
      {
        title: 'Profilo Utente',
        path: '/profile',
        description: 'Configurazione profilo utente',
        icon: Users,
        requiresAuth: true
      },
      {
        title: 'Notifiche',
        path: '/notifications',
        description: 'Gestione notifiche e alert',
        icon: Bell,
        requiresAuth: true
      },
      {
        title: 'Gestione Lingue',
        path: '/language-manager',
        description: 'Gestione lingue e traduzioni del sistema',
        icon: Languages,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'dev-tools',
    name: 'Strumenti Sviluppo & Admin',
    description: 'Strumenti di sviluppo, testing e amministrazione',
    icon: Code,
    color: 'red',
    pages: [
      {
        title: 'Design Lab',
        path: '/design-lab',
        description: 'Laboratorio di design per prototipi e componenti',
        icon: Palette,
        requiresAuth: true
      },
      {
        title: 'Confronto API',
        path: '/api-comparison',
        description: 'Confronto tra diverse API e modelli di IA',
        icon: GitCompare,
        requiresAuth: true
      },
      {
        title: 'Ispettore Database',
        path: '/database-inspector',
        description: 'Ispezione e analisi del database',
        icon: Database,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Log API',
        path: '/api-logs',
        description: 'Visualizzazione log API ed errori',
        icon: FileText,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Monitor Sistema',
        path: '/system-monitor',
        description: 'Monitoraggio prestazioni e risorse del sistema',
        icon: Activity,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Playground Test',
        path: '/testing-playground',
        description: 'Ambiente di test per nuove funzionalità',
        icon: FlaskConical,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Console Debug',
        path: '/debug-console',
        description: 'Console di debug in tempo reale',
        icon: Code,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Admin Intranet',
        path: '/intranet-admin',
        description: 'Pannello di amministrazione intranet',
        icon: Shield,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Gestione Utenti',
        path: '/user-management',
        description: 'Gestione utenti e permessi',
        icon: Users,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Designer Workflow',
        path: '/workflow-designer',
        description: 'Designer visuale di flussi di lavoro automatizzati',
        icon: Workflow,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Monitor Edge Functions',
        path: '/edge-functions-monitor',
        description: 'Monitoraggio funzioni serverless',
        icon: Server,
        requiresAuth: true,
        requiresAdmin: true
      }
    ]
  },
  {
    id: 'communications',
    name: 'Comunicazioni & Chiamate',
    description: 'Sistema di chiamate e comunicazioni in tempo reale',
    icon: Phone,
    color: 'cyan',
    pages: [
      {
        title: 'Call Center',
        path: '/call-center',
        description: 'Centro chiamate con WebRTC',
        icon: Phone,
        requiresAuth: true
      },
      {
        title: 'Cronologia Chiamate',
        path: '/call-history',
        description: 'Cronologia e registrazioni delle chiamate',
        icon: Activity,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'utilities',
    name: 'Utilità & Documentazione',
    description: 'Utilità generali e documentazione del sistema',
    icon: Wrench,
    color: 'yellow',
    pages: [
      {
        title: 'Guida Utente',
        path: '/user-guide',
        description: 'Guida completa utente del sistema',
        icon: BookOpen,
        requiresAuth: true
      },
      {
        title: 'Documentazione API',
        path: '/api-docs',
        description: 'Documentazione tecnica delle API disponibili',
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
