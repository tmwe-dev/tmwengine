# Schema Pre-Migration: 2025-11-03

## Obiettivo Modifica
Estendere la tabella `email_ai_classifications` per supportare:
- Livelli di urgenza (`urgency`)
- Azioni suggerite (`action_suggested`)
- Pattern rilevati (`detected_patterns`)
- Ragionamento AI (`reasoning`)
- Prompt personalizzati (`custom_prompt`)
- Tag intelligenti (`tags`)

## Tabelle Coinvolte
- `email_ai_classifications`

## Schema Corrente

### Colonne Tabella `email_ai_classifications`

| Column Name | Data Type | Nullable | Default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| email_message_id | uuid | YES | NULL |
| user_email | text | NO | NULL |
| category | text | NO | NULL |
| confidence | real | NO | NULL |
| ai_summary | text | YES | NULL |
| keywords | ARRAY | YES | NULL |
| sender_email | text | NO | NULL |
| sender_domain | text | NO | NULL |
| sender_logo_url | text | YES | NULL |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| email_uid | text | NO | NULL |
| folder_name | text | YES | 'INBOX'::text |
| is_verified | boolean | YES | false |
| subject | text | YES | NULL |
| body_preview | text | YES | NULL |
| body_text | text | YES | NULL |
| has_attachments | boolean | YES | false |
| email_date | timestamp with time zone | YES | NULL |
| email_id | uuid | NO | NULL |

### DDL Corrente (ricostruito)

```sql
CREATE TABLE public.email_ai_classifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email_message_id uuid,
    user_email text NOT NULL,
    category text NOT NULL,
    confidence real NOT NULL,
    ai_summary text,
    keywords text[],
    sender_email text NOT NULL,
    sender_domain text NOT NULL,
    sender_logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    email_uid text NOT NULL,
    folder_name text DEFAULT 'INBOX'::text,
    is_verified boolean DEFAULT false,
    subject text,
    body_preview text,
    body_text text,
    has_attachments boolean DEFAULT false,
    email_date timestamp with time zone,
    email_id uuid NOT NULL
);
```

### Constraints Esistenti
- PRIMARY KEY: `id`
- UNIQUE KEY: `email_id` (per upsert)

### Note
- La tabella non ha attualmente le colonne per urgency, action_suggested, detected_patterns, reasoning, custom_prompt, tags
- Edge function salvava alcuni campi opzionali solo nei log (non persistiti nel DB)
