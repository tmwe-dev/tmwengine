/**
 * DESIGN LAB - COMPONENT TEMPLATES
 * Template precompilati per componenti con preset props comuni
 */

export interface ComponentTemplate {
  id: string;
  componentName: string;
  templateName: string;
  description: string;
  props: Record<string, any>;
  category: string;
}

/**
 * Templates per Button
 */
export const BUTTON_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'button-primary',
    componentName: 'Button',
    templateName: 'Primary Action',
    description: 'Pulsante primario per azioni principali',
    props: {
      variant: 'default',
      size: 'default',
      children: 'Conferma',
    },
    category: 'Button',
  },
  {
    id: 'button-secondary',
    componentName: 'Button',
    templateName: 'Secondary Action',
    description: 'Pulsante secondario per azioni alternative',
    props: {
      variant: 'secondary',
      size: 'default',
      children: 'Annulla',
    },
    category: 'Button',
  },
  {
    id: 'button-destructive',
    componentName: 'Button',
    templateName: 'Destructive Action',
    description: 'Pulsante per azioni distruttive (elimina, rimuovi)',
    props: {
      variant: 'destructive',
      size: 'default',
      children: 'Elimina',
    },
    category: 'Button',
  },
  {
    id: 'button-icon',
    componentName: 'Button',
    templateName: 'Icon Button',
    description: 'Pulsante solo icona',
    props: {
      variant: 'ghost',
      size: 'icon',
    },
    category: 'Button',
  },
];

/**
 * Templates per Card
 */
export const CARD_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'card-basic',
    componentName: 'Card',
    templateName: 'Basic Card',
    description: 'Card semplice con header e contenuto',
    props: {
      className: 'w-full',
    },
    category: 'Card',
  },
  {
    id: 'card-with-footer',
    componentName: 'Card',
    templateName: 'Card with Footer',
    description: 'Card completa con header, contenuto e footer',
    props: {
      className: 'w-full',
      withFooter: true,
    },
    category: 'Card',
  },
];

/**
 * Templates per Input
 */
export const INPUT_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'input-text',
    componentName: 'Input',
    templateName: 'Text Input',
    description: 'Input di testo standard',
    props: {
      type: 'text',
      placeholder: 'Inserisci testo...',
    },
    category: 'Input',
  },
  {
    id: 'input-email',
    componentName: 'Input',
    templateName: 'Email Input',
    description: 'Input per indirizzi email',
    props: {
      type: 'email',
      placeholder: 'email@example.com',
    },
    category: 'Input',
  },
  {
    id: 'input-password',
    componentName: 'Input',
    templateName: 'Password Input',
    description: 'Input per password',
    props: {
      type: 'password',
      placeholder: '••••••••',
    },
    category: 'Input',
  },
  {
    id: 'input-number',
    componentName: 'Input',
    templateName: 'Number Input',
    description: 'Input numerico',
    props: {
      type: 'number',
      placeholder: '0',
    },
    category: 'Input',
  },
];

/**
 * Templates per Dialog
 */
export const DIALOG_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'dialog-confirm',
    componentName: 'Dialog',
    templateName: 'Confirmation Dialog',
    description: 'Dialog di conferma con azioni',
    props: {
      title: 'Conferma azione',
      description: 'Sei sicuro di voler procedere?',
    },
    category: 'Dialog',
  },
  {
    id: 'dialog-form',
    componentName: 'Dialog',
    templateName: 'Form Dialog',
    description: 'Dialog con form per input utente',
    props: {
      title: 'Inserisci dati',
    },
    category: 'Dialog',
  },
];

/**
 * ALL TEMPLATES - Export combinato
 */
export const ALL_TEMPLATES: ComponentTemplate[] = [
  ...BUTTON_TEMPLATES,
  ...CARD_TEMPLATES,
  ...INPUT_TEMPLATES,
  ...DIALOG_TEMPLATES,
];

/**
 * Get templates by component name
 */
export function getTemplatesByComponent(componentName: string): ComponentTemplate[] {
  return ALL_TEMPLATES.filter(
    (template) => template.componentName.toLowerCase() === componentName.toLowerCase()
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): ComponentTemplate | undefined {
  return ALL_TEMPLATES.find((template) => template.id === templateId);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  const categories = new Set(ALL_TEMPLATES.map((t) => t.category));
  return Array.from(categories).sort();
}
