/**
 * Types per Email Management - Sistema completamente isolato
 */

export interface EmailSenderGroup {
  id: string;
  nome_gruppo: string;
  descrizione?: string;
  colore: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSenderRule {
  id: string;
  sender_email: string;
  group_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSenderAction {
  id: string;
  sender_email: string;
  action_type: 'move_to_folder' | 'mark_as_read' | 'archive' | 'delete' | 'forward';
  action_params: Record<string, any> | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SenderAnalysis {
  email: string;
  domain: string;
  companyName: string;
  emailCount: number;
  firstSeen: string;
  lastSeen: string;
  hasAttachments: boolean;
  topSubjectKeywords: string[];
  avgSubjectLength: number;
  isClassified: boolean;
  currentGroup?: EmailSenderGroup;
}

export type GroupType = 
  | 'operativo'
  | 'commerciale' 
  | 'amministrativo'
  | 'dogana'
  | 'tecnologie'
  | 'spam'
  | 'promo'
  | 'documenti'
  | 'offerte'
  | 'custom';

export const DEFAULT_GROUPS: Array<{
  name: string;
  type: GroupType;
  color: string;
  icon: string;
  description: string;
}> = [
  { name: 'Operativo', type: 'operativo', color: '#3B82F6', icon: '⚙️', description: 'Email operative quotidiane' },
  { name: 'Commerciale', type: 'commerciale', color: '#F59E0B', icon: '💼', description: 'Vendite, offerte, clienti' },
  { name: 'Amministrativo', type: 'amministrativo', color: '#10B981', icon: '📊', description: 'Contabilità, amministrazione' },
  { name: 'Dogana', type: 'dogana', color: '#8B5CF6', icon: '🛃', description: 'Documenti doganali' },
  { name: 'Tecnologie e Sistemi', type: 'tecnologie', color: '#06B6D4', icon: '💻', description: 'IT, software, sistemi' },
  { name: 'Spam', type: 'spam', color: '#EF4444', icon: '🚫', description: 'Email indesiderate' },
  { name: 'Promo', type: 'promo', color: '#EC4899', icon: '🎁', description: 'Promozionali, marketing' },
  { name: 'Documenti', type: 'documenti', color: '#6366F1', icon: '📄', description: 'Contratti, certificati' },
  { name: 'Offerte', type: 'offerte', color: '#14B8A6', icon: '💰', description: 'Quotazioni, preventivi' },
];

// AI Sender Categorization
export interface AISuggestion {
  id: string; // DB id
  sender_email: string;
  suggested_group: {
    id: string | null;
    name: string;
    type: GroupType | 'altro';
    color?: string;
    icon?: string;
    is_new: boolean;
    description?: string;
  };
  confidence: number;
  reasoning: string;
  cost: {
    tokens_input: number;
    tokens_output: number;
    eur: number;
    is_free: boolean;
  };
  status: 'pending' | 'accepted' | 'rejected';
}
