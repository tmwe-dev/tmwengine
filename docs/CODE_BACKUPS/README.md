# 💾 Code Backups

Questa cartella contiene i backup del codice **PRIMA** di modifiche significative.

## 📋 Quando Creare Backup

**OBBLIGATORIO** prima di:
- Modificare hook critici (useAutoSpeaker, useElevenLabsTTS, etc.)
- Refactoring di componenti complessi
- Integrazioni di nuove funzionalità che modificano codice esistente
- Modifiche che potrebbero richiedere rollback

## 📝 Naming Convention

```
YYYY-MM-DD_pre-[feature-name]-[component-name].[ext].backup
```

**Esempi:**
- `2025-01-13_pre-tts-dual-useAutoSpeaker.tsx.backup`
- `2025-01-15_pre-multilang-UserSettings.tsx.backup`

## 📄 Template Backup File

Ogni backup deve iniziare con un header:

```typescript
// ============================================
// BACKUP PRE-IMPLEMENTAZIONE [FEATURE]
// Data: YYYY-MM-DD
// File Originale: [path]
// Motivo: [descrizione]
// ============================================
```

## 🚨 Procedura

1. **Crea backup** → file in questa cartella
2. **Implementa modifiche** → al codice originale
3. **Testa** → verifica funzionamento
4. **Documenta** → aggiorna changelog se necessario

## 📁 Struttura

```
CODE_BACKUPS/
├── README.md (questo file)
├── 2025-01-13_pre-tts-dual-useAutoSpeaker.tsx.backup
└── [future backups...]
```

---

**Nota:** Questi backup sono critici per rollback rapidi in caso di problemi!
