# 💾 Database Backups

Questa cartella contiene i backup dello schema database **PRIMA** di ogni migrazione.

## 📋 Quando Creare Backup

**OBBLIGATORIO** prima di:
- Modificare tabelle (ADD/DROP COLUMN, ALTER)
- Creare/modificare trigger
- Modificare RLS policies
- Creare/modificare database functions
- Qualsiasi ALTER TABLE

## 📝 Naming Convention

```
YYYY-MM-DD_pre-migration-[descrizione-breve].md
```

**Esempi:**
- `2025-01-15_pre-migration-image-gen.md`
- `2025-01-20_pre-migration-shared-emails.md`
- `2025-02-01_pre-migration-rls-update.md`

## 📄 Template Backup File

```markdown
## Schema Pre-Migration: [Data]

### Obiettivo Modifica
[Cosa vogliamo fare]

### Tabelle Coinvolte
- `tabella_1`
- `tabella_2`

### DDL Corrente
\`\`\`sql
CREATE TABLE tabella_1 (
  ...
);
\`\`\`

### Trigger Attivi
\`\`\`sql
CREATE TRIGGER ...
\`\`\`

### RLS Policies
\`\`\`sql
CREATE POLICY ...
\`\`\`

### Database Functions
\`\`\`sql
CREATE FUNCTION ...
\`\`\`
```

## 🚨 Procedura

1. **Crea backup** → file in questa cartella
2. **Esegui migration** → via Supabase
3. **Aggiorna** `DATABASE_INFO.md` con changelog
4. **Link backup** nel changelog

## 📁 Struttura

```
DATABASE_BACKUPS/
├── README.md (questo file)
├── 2025-01-15_pre-migration-image-gen.md
├── 2025-01-20_pre-migration-xxx.md
└── [future backups...]
```

---

**Nota:** Questi backup sono critici perché Lovable NON fa backup automatico di Supabase!
