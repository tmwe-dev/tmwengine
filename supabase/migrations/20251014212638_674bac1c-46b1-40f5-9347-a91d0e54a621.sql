-- Create table for UI component backups
CREATE TABLE IF NOT EXISTS public.ui_component_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL,
  backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  version TEXT NOT NULL,
  
  -- Complete documentation
  visual_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  animations JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  interactive_elements JSONB NOT NULL DEFAULT '{}'::jsonb,
  code_snippets JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_component_version UNIQUE(component_name, version)
);

-- Enable RLS
ALTER TABLE public.ui_component_backups ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Users can manage component backups"
  ON public.ui_component_backups
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_ui_component_backups_component_name ON public.ui_component_backups(component_name);
CREATE INDEX idx_ui_component_backups_type ON public.ui_component_backups(component_type);

-- Insert complete backup of email cards
INSERT INTO public.ui_component_backups (
  component_name,
  component_type,
  version,
  visual_properties,
  animations,
  layout_properties,
  interactive_elements,
  code_snippets,
  notes,
  tags
) VALUES (
  'tmwe-email-cards',
  'email-card',
  'v1.0.0-pre-deletion',
  -- VISUAL PROPERTIES
  '{
    "unread_state": {
      "background": "bg-card",
      "border": "border-l-4 border-l-primary/60",
      "text_color": "text-foreground",
      "gradient": "bg-gradient-to-r from-primary/5 via-transparent to-transparent",
      "shadow": "shadow-sm"
    },
    "read_state": {
      "background": "bg-card/50",
      "border": "border-l-2 border-l-muted",
      "text_color": "text-muted-foreground",
      "gradient": "none",
      "shadow": "shadow-sm"
    },
    "selected_state": {
      "ring": "ring-2 ring-primary",
      "background_overlay": "bg-primary/5"
    },
    "hover_state": {
      "shadow": "hover:shadow-lg",
      "border_glow": "hover:border-l-primary",
      "scale": "hover:scale-[1.01]"
    },
    "group_indicator": {
      "colors": {
        "blue": "bg-blue-500/20 text-blue-700 dark:text-blue-300",
        "green": "bg-green-500/20 text-green-700 dark:text-green-300",
        "purple": "bg-purple-500/20 text-purple-700 dark:text-purple-300",
        "orange": "bg-orange-500/20 text-orange-700 dark:text-orange-300",
        "default": "bg-gray-500/20 text-gray-700 dark:text-gray-300"
      },
      "badge_classes": "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    },
    "pseudo_elements": {
      "unread_dot": "before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-2 before:bg-primary before:rounded-full before:animate-pulse"
    }
  }'::jsonb,
  -- ANIMATIONS
  '{
    "card_transitions": {
      "base": "transition-all duration-200",
      "hover_scale": "hover:scale-[1.01]",
      "click_scale": "active:scale-[0.99]"
    },
    "maximize_button": {
      "base": "transition-all duration-200",
      "hover": "hover:scale-110 hover:bg-primary/10",
      "wiggle_animation": "animate-[wiggle_0.5s_ease-in-out]",
      "wiggle_keyframes": "@keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }"
    },
    "badges": {
      "fade_in": "animate-fade-in",
      "scale_in": "animate-scale-in"
    },
    "loading_states": {
      "skeleton": "animate-pulse bg-muted"
    }
  }'::jsonb,
  -- LAYOUT PROPERTIES
  '{
    "card_structure": {
      "base_classes": "rounded-lg p-3 sm:p-4 cursor-pointer relative overflow-hidden",
      "border": "border",
      "spacing": "space-y-2"
    },
    "border_left_indicator": {
      "unread": "border-l-4 border-l-primary/60",
      "read": "border-l-2 border-l-muted",
      "hover": "hover:border-l-primary"
    },
    "grid_layout": {
      "container": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4",
      "card_min_height": "min-h-[120px]"
    },
    "list_layout": {
      "container": "space-y-2 sm:space-y-3",
      "card_structure": "flex flex-col"
    },
    "responsive_spacing": {
      "padding": "p-3 sm:p-4",
      "gap": "gap-2 sm:gap-3"
    }
  }'::jsonb,
  -- INTERACTIVE ELEMENTS
  '{
    "maximize_button": {
      "icon": "Maximize2",
      "size": 16,
      "classes": "p-1.5 rounded-md hover:bg-primary/10 transition-all duration-200 hover:scale-110",
      "click_handler": "handleMaximizeClick",
      "stop_propagation": true
    },
    "dropdown_menu": {
      "trigger": "MoreVertical icon",
      "items": [
        "Gestisci regole",
        "Archivia",
        "Sposta in cartella",
        "Elimina"
      ]
    },
    "badges": {
      "attachment": {
        "icon": "Paperclip",
        "classes": "text-muted-foreground"
      },
      "starred": {
        "icon": "Star",
        "classes": "text-yellow-500 fill-yellow-500"
      },
      "group_indicator": {
        "dynamic_colors": true,
        "position": "inline with sender name"
      },
      "rule_indicator": {
        "icon": "Zap",
        "color": "text-blue-500",
        "tooltip": "Ha regole attive"
      }
    },
    "multi_select": {
      "checkbox": "Checkbox component",
      "bulk_actions": ["delete", "archive", "move"]
    }
  }'::jsonb,
  -- CODE SNIPPETS
  '{
    "card_base_unread": "<Card className=\"rounded-lg border p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden bg-gradient-to-r from-primary/5 via-transparent to-transparent border-l-4 border-l-primary/60 hover:scale-[1.01] bg-card shadow-sm before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-2 before:bg-primary before:rounded-full before:animate-pulse\">",
    "card_base_read": "<Card className=\"rounded-lg border p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-l-2 border-l-muted hover:scale-[1.01] bg-card/50 shadow-sm\">",
    "maximize_button": "<button onClick={handleMaximizeClick} className=\"p-1.5 rounded-md hover:bg-primary/10 transition-all duration-200 hover:scale-110 animate-[wiggle_0.5s_ease-in-out]\" title=\"Visualizza corpo email\"><Maximize2 className=\"h-4 w-4\" /></button>",
    "group_badge": "<Badge className=\"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getGroupColor(email.group)}\">",
    "sender_display": "<div className=\"flex items-center gap-2 flex-1 min-w-0\"><div className=\"font-medium text-sm sm:text-base truncate\">{email.from}</div></div>"
  }'::jsonb,
  'Complete backup of TMWE Email Cards before deletion. Includes all visual properties (gradients, colors, shadows, borders), animations (hover effects, scale, wiggle), layout properties (spacing, borders, responsive design), and interactive elements (maximize button, badges, icons). Created as requested for safe storage before component removal.',
  ARRAY['email', 'card', 'backup', 'tmwe', 'ui-components', 'pre-deletion']
);