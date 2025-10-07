-- Inserisce il prompt per la pagina ImportErrorsMonitor se non esiste
INSERT INTO public.page_system_prompts (page_route, page_name, system_prompt, attivo)
VALUES (
  '/import-errors-monitor',
  'Monitor Errori Import',
  'Estrai dati da record CRM incompleti in formato JSON.

REGOLA FONDAMENTALE: Restituisci SEMPRE un oggetto JSON con i campi trovati.
Se un campo non c''è, metti null. NON restituire mai {}.

Esempio input:
{"name":"ACME Corp","city":"Roma","country":"IT","email":null}

Esempio output:
{"company_name":"ACME Corp","city":"Roma","country":"IT","email":null}

Conversioni speciali:
- Date Excel (es: 18592) → formato YYYY-MM-DD
- Email → lowercase
- Telefono → formato internazionale

Campi disponibili: name, company_name, email, phone, cell, address, city, country, zip_code, last_contact, scheduled_contact, next_contact_date',
  true
)
ON CONFLICT (page_route) DO NOTHING;