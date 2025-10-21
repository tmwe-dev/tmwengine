export interface PromptSection {
  id: string;
  section_type: string;
  section_name: string;
  content: string;
  thumbnail_url?: string | null;
  topic_tags?: string[] | null;
  is_active: boolean;
  order_priority: number;
  created_at: string;
  updated_at: string;
}

export interface ComposedPromptBlock {
  id: string; // UUID temporaneo per DnD
  section_id: string; // ID originale della sezione
  section_type: string;
  section_name: string;
  content: string;
  order: number;
  is_editable: boolean;
}

export interface ComposedPrompt {
  id?: string;
  name: string;
  content: string;
  target_agent: 'gpt-4' | 'claude-3' | 'gemini-pro';
  section_ids: string[];
  blocks: ComposedPromptBlock[];
}

export type SectionGroup = 'global' | 'base' | 'personality' | 'style' | 'orchestrator';

export interface ThumbnailGenerationOptions {
  width?: number; // Default: 400px
  height?: number; // Default: auto
  scale?: number; // Default: 2 (retina)
  backgroundColor?: string; // Default: '#ffffff'
}
