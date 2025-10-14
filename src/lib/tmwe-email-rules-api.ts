// TMWE Email Rules API Client
import { getApiConfigFromDB } from "./tmwe-api-integrated";

const API_BASE_URL = "https://app.tmwe.it/app.php";

export interface EmailRule {
  id_rule?: number;
  nome: string;
  descrizione?: string;
  attivo: boolean;
  priorita?: number;
  azione_finale?: 'stop' | 'continue';
  created_at?: string;
  updated_at?: string;
}

export interface EmailRuleComponent {
  id_component?: number;
  id_rule: number;
  campo: string;
  operatore: string;
  valore: string;
  ordine?: number;
}

export interface EmailRuleAction {
  id_action?: number;
  id_rule: number;
  tipo_azione: string;
  parametri?: Record<string, any>;
  ordine?: number;
}

export interface CreateRuleBulkRequest {
  nome: string;
  descrizione?: string;
  attivo: boolean;
  priorita?: number;
  azione_finale?: 'stop' | 'continue';
  componenti: Array<{
    campo: string;
    operatore: string;
    valore: string;
    ordine?: number;
  }>;
  azioni: Array<{
    tipo_azione: string;
    parametri?: Record<string, any>;
    ordine?: number;
  }>;
}

export interface ActionsMetadata {
  azioni_disponibili: Array<{
    tipo: string;
    nome: string;
    descrizione: string;
    categoria: string;
    parametri: Array<{
      nome: string;
      tipo: string;
      richiesto: boolean;
      descrizione: string;
      valori_possibili?: string[];
      valore_default?: any;
    }>;
  }>;
}

class EmailRulesAPI {
  private async makeRequest(action: string, data: any) {
    const config = await getApiConfigFromDB();
    if (!config) {
      throw new Error("TMWE credentials not configured");
    }

    const response = await fetch(`${API_BASE_URL}?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  // Email Rules
  async getRules(params?: { id_rule?: number; show_all?: boolean }): Promise<EmailRule[]> {
    const data = await this.makeRequest("email_rule", {
      handler: "get_rules",
      ...params,
    });
    return data.regole || [];
  }

  async createRule(rule: Omit<EmailRule, 'id_rule'>): Promise<EmailRule> {
    const data = await this.makeRequest("email_rule", {
      handler: "create_rule",
      ...rule,
    });
    return data.regola;
  }

  async updateRule(id_rule: number, rule: Partial<EmailRule>): Promise<EmailRule> {
    const data = await this.makeRequest("email_rule", {
      handler: "update_rule",
      id_rule,
      ...rule,
    });
    return data.regola;
  }

  async deleteRule(id_rule: number): Promise<void> {
    await this.makeRequest("email_rule", {
      handler: "delete_rule",
      id_rule,
    });
  }

  // Bulk creation (complete rule with components and actions)
  async createRuleBulk(request: CreateRuleBulkRequest): Promise<EmailRule> {
    const data = await this.makeRequest("email_rule_bulk", {
      handler: "create_complete_rule",
      ...request,
    });
    return data.regola;
  }

  // Rule Components
  async getComponents(params: { id_rule?: number; id_component?: number }): Promise<EmailRuleComponent[]> {
    const data = await this.makeRequest("email_rule_component", {
      handler: "get_components",
      ...params,
    });
    return data.componenti || [];
  }

  async createComponent(component: Omit<EmailRuleComponent, 'id_component'>): Promise<EmailRuleComponent> {
    const data = await this.makeRequest("email_rule_component", {
      handler: "create_component",
      ...component,
    });
    return data.componente;
  }

  async updateComponent(id_component: number, component: Partial<EmailRuleComponent>): Promise<EmailRuleComponent> {
    const data = await this.makeRequest("email_rule_component", {
      handler: "update_component",
      id_component,
      ...component,
    });
    return data.componente;
  }

  async deleteComponent(id_component: number): Promise<void> {
    await this.makeRequest("email_rule_component", {
      handler: "delete_component",
      id_component,
    });
  }

  // Rule Actions
  async getActions(params: { id_rule?: number; id_action?: number }): Promise<EmailRuleAction[]> {
    const data = await this.makeRequest("email_rule_action", {
      handler: "get_actions",
      ...params,
    });
    return data.azioni || [];
  }

  async createAction(action: Omit<EmailRuleAction, 'id_action'>): Promise<EmailRuleAction> {
    const data = await this.makeRequest("email_rule_action", {
      handler: "create_action",
      ...action,
    });
    return data.azione;
  }

  async updateAction(id_action: number, action: Partial<EmailRuleAction>): Promise<EmailRuleAction> {
    const data = await this.makeRequest("email_rule_action", {
      handler: "update_action",
      id_action,
      ...action,
    });
    return data.azione;
  }

  async deleteAction(id_action: number): Promise<void> {
    await this.makeRequest("email_rule_action", {
      handler: "delete_action",
      id_action,
    });
  }

  // Metadata
  async getActionsMetadata(): Promise<ActionsMetadata> {
    return this.makeRequest("email_rule_action", {
      handler: "get_metadata",
      metadata: true,
    });
  }

  async getAvailableFields(): Promise<string[]> {
    const data = await this.makeRequest("email_rule_component", {
      handler: "get_available_fields",
    });
    return data.campi_disponibili || [];
  }

  async getAvailableOperators(campo?: string): Promise<string[]> {
    const data = await this.makeRequest("email_rule_component", {
      handler: "get_available_operators",
      campo,
    });
    return data.operatori_disponibili || [];
  }
}

export const emailRulesAPI = new EmailRulesAPI();
