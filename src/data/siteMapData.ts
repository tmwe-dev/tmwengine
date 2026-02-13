import { LucideIcon } from 'lucide-react';
import { 
  BarChart3, Mail, MessageSquare, Upload, Settings, 
  Code, Phone, BookOpen, Sparkles, Database,
  FileText, Calendar, Radio, Bot, Palette, Brain,
  Users, Activity, Megaphone, Inbox, FolderOpen,
  Tag, Filter, TestTube, GitCompare, Mic, Languages,
  LayoutDashboard, Wrench, Map, Globe, Server,
  FlaskConical, Layers, Eye, Workflow, Bell,
  Shield, Rocket, Download, AlertTriangle, Sliders,
  MonitorSmartphone, Zap
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
      },
      {
        title: 'Email Campagne',
        path: '/email-campagne',
        description: 'Campagne email marketing con template e invio automatico',
        icon: Mail,
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
        description: 'Laboratorio sperimentale multi-agente per testare diversi modelli di IA',
        icon: Sparkles,
        requiresAuth: true
      },
      {
        title: 'Calibrazione Lab',
        path: '/chat-laboratory/calibration',
        description: 'Calibrazione e tuning degli agenti del laboratorio AI',
        icon: Sliders,
        requiresAuth: true
      },
      {
        title: 'Radio Chat',
        path: '/radio-chat',
        description: 'Chat con comunicazione vocale e carosello 3D',
        icon: Radio,
        requiresAuth: true
      },
      {
        title: 'AI Communication Hub',
        path: '/ai-communication-hub',
        description: 'Hub comunicazione AI con ElevenLabs e WebRTC',
        icon: Brain,
        requiresAuth: true
      },
      {
        title: 'Prompt System Manager',
        path: '/prompt-system-manager',
        description: 'Gestione centralizzata del sistema prompt per tutti gli agenti',
        icon: Bot,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'intranet',
    name: 'Intranet',
    description: 'Sistema di comunicazione interna per il team',
    icon: Users,
    color: 'teal',
    pages: [
      {
        title: 'Intranet',
        path: '/intranet',
        description: 'Chat interna del team con stanze e messaggi in tempo reale',
        icon: MessageSquare,
        requiresAuth: true
      },
      {
        title: 'Admin Intranet',
        path: '/intranet-admin',
        description: 'Pannello di amministrazione intranet (gestione stanze, utenti)',
        icon: Shield,
        requiresAuth: true,
        requiresAdmin: true
      }
    ]
  },
  {
    id: 'email',
    name: 'Gestione Email',
    description: 'Sistema completo di gestione, download e analisi delle email',
    icon: Mail,
    color: 'green',
    pages: [
      {
        title: 'Email Manager',
        path: '/email-manager',
        description: 'Dashboard email principale con integrazione TMWE (richiede auth Microsoft)',
        icon: LayoutDashboard,
        requiresAuth: true
      },
      {
        title: 'FunnEmail',
        path: '/funnemail',
        description: 'Analisi avanzata di email con categorizzazione intelligente AI',
        icon: Sparkles,
        requiresAuth: true
      },
      {
        title: 'Email Hub',
        path: '/emailhub',
        description: 'Hub centralizzato per gestione email con viste multiple',
        icon: Inbox,
        requiresAuth: true
      },
      {
        title: 'Single Mail Importer',
        path: '/single-mail',
        description: 'Importazione singola email da Microsoft Graph',
        icon: Download,
        requiresAuth: true
      },
      {
        title: 'Single Fast',
        path: '/single-fast',
        description: 'Download veloce email con log real-time e sequenza automatica',
        icon: Rocket,
        requiresAuth: true
      },
      {
        title: 'Dual Download',
        path: '/dual-download',
        description: 'Download dual-phase email con strategie multiple',
        icon: Download,
        requiresAuth: true
      },
      {
        title: 'Email Senders',
        path: '/email-senders',
        description: 'Gestione e raggruppamento mittenti email',
        icon: Tag,
        requiresAuth: true
      },
      {
        title: 'Email Rules',
        path: '/email-rules',
        description: 'Regole di classificazione email con integrazione TMWE',
        icon: Filter,
        requiresAuth: true
      },
      {
        title: 'Email Debug Tester',
        path: '/email-debug-tester',
        description: 'Strumenti di debug e test per il sistema email',
        icon: TestTube,
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
        title: 'Import Templates',
        path: '/import-templates',
        description: 'Template di importazione per diverse sorgenti dati',
        icon: Upload,
        requiresAuth: true
      },
      {
        title: 'Gestisci Import',
        path: '/gestisci-import',
        description: 'Gestione e monitoraggio delle importazioni in corso',
        icon: Layers,
        requiresAuth: true
      },
      {
        title: 'Record Importati',
        path: '/record-importati',
        description: 'Visualizzazione e gestione dei record importati',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Monitor Errori Import',
        path: '/import-errors-monitor',
        description: 'Monitoraggio e risoluzione errori di importazione',
        icon: AlertTriangle,
        requiresAuth: true
      },
      {
        title: 'Template Alias',
        path: '/template-alias',
        description: 'Gestione alias per mappatura campi template',
        icon: Tag,
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
        path: '/ai-config',
        description: 'Configurazione di modelli e API di intelligenza artificiale',
        icon: Bot,
        requiresAuth: true
      },
      {
        title: 'Configurazione Generale',
        path: '/general-config',
        description: 'Impostazioni generali della piattaforma',
        icon: Sliders,
        requiresAuth: true
      },
      {
        title: 'Impostazioni Database',
        path: '/database-settings',
        description: 'Configurazione e gestione del database',
        icon: Database,
        requiresAuth: true
      },
      {
        title: 'Impostazioni Notifiche',
        path: '/notification-settings',
        description: 'Configurazione notifiche push e alert',
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
        description: 'Dashboard Design Lab per prototipi e componenti',
        icon: Palette,
        requiresAuth: true
      },
      {
        title: 'Design Lab Scanner',
        path: '/design-lab-scanner',
        description: 'Scanner automatico dei componenti del design system',
        icon: Eye,
        requiresAuth: true
      },
      {
        title: 'Tables',
        path: '/tables',
        description: 'Visualizzazione e ispezione tabelle database',
        icon: Database,
        requiresAuth: true
      },
      {
        title: 'Code Review',
        path: '/code-review',
        description: 'Strumenti di code review e analisi codice',
        icon: Code,
        requiresAuth: true
      },
      {
        title: 'TMWE API Tester',
        path: '/tmwe-api-tester',
        description: 'Test interattivo delle API TMWE (Microsoft Graph)',
        icon: FlaskConical,
        requiresAuth: true
      },
      {
        title: 'API Functions Reference',
        path: '/api-functions',
        description: 'Documentazione e riferimento funzioni API disponibili',
        icon: FileText,
        requiresAuth: true
      },
      {
        title: 'Edge Function Versions',
        path: '/edge-function-versions',
        description: 'Gestione versioni e storico delle edge functions',
        icon: Server,
        requiresAuth: true
      },
      {
        title: 'Admin Prompts',
        path: '/admin/prompts',
        description: 'Amministrazione prompt di sistema',
        icon: Bot,
        requiresAuth: true,
        requiresAdmin: true
      },
      {
        title: 'Code Screen',
        path: '/admin/codescreen',
        description: 'Schermo codice admin per visualizzazione e editing',
        icon: MonitorSmartphone,
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
        title: 'Call Metrics',
        path: '/call-metrics',
        description: 'Dashboard metriche e statistiche chiamate',
        icon: Activity,
        requiresAuth: true
      },
      {
        title: 'Call Room',
        path: '/call-room',
        description: 'Stanza chiamata WebRTC per audio/video in tempo reale',
        icon: Phone,
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
        description: 'Guida completa interattiva del sistema',
        icon: BookOpen,
        requiresAuth: true
      },
      {
        title: 'Mappa del Sito',
        path: '/site-map',
        description: 'Esploratore completo di tutte le pagine e funzionalità',
        icon: Map,
        requiresAuth: true
      }
    ]
  },
  {
    id: 'auth',
    name: 'Autenticazione',
    description: 'Pagine di autenticazione e integrazione OAuth',
    icon: Shield,
    color: 'indigo',
    pages: [
      {
        title: 'Login',
        path: '/auth',
        description: 'Pagina di autenticazione utente',
        icon: Shield,
        requiresAuth: false
      },
      {
        title: 'TMWE Auth Test',
        path: '/tmwe-test',
        description: 'Test autenticazione Microsoft (TMWE)',
        icon: TestTube,
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
