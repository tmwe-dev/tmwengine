export interface DesignLabPage {
  id: string;
  page_name: string;
  description?: string;
  is_template: boolean;
  user_id?: string;
  config?: Record<string, any>;
  version: number;
  status: 'draft' | 'review' | 'published' | 'archived';
  published_at?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignLabComponent {
  id: string;
  page_id: string;
  component_type: string;
  props: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
  parent_id?: string;
  order_index: number;
  created_at: string;
  // TICKET 5: Link to extracted component for real rendering
  extracted_component?: any; // ExtractedComponent from design-lab-scanner
}

export interface DesignLabLogic {
  id: string;
  component_id: string;
  event_type: 'onClick' | 'onChange' | 'onSubmit' | 'onLoad';
  action_type: string;
  action_config: Record<string, any>;
  created_at: string;
}

export interface SystemAction {
  id: string;
  action_id: string;
  name: string;
  description?: string;
  category?: 'data' | 'navigation' | 'notification' | 'integration';
  icon?: string;
  is_functional: boolean;
  requires_auth: boolean;
  required_config_schema?: Record<string, any>;
  example_config?: Record<string, any>;
  created_at: string;
}
