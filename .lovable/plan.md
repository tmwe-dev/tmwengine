

# Fix SMART_PRIORITY Agent Selection Bug

## Problem
The `selectSmartPriority` function in `agent-selector.ts` searches for agents by checking if their **name** contains `'claude'`, `'gpt'`, or `'gemini'`. But the actual agent names are "Albert", "Pitagora", "Archimede" — none match. Result: always falls back to index 0 (Albert), making rotation broken.

Same bug exists in `selectInterruptBased` — it matches `agentName` against keyword map keys like `'gemini'`, `'gpt'`, `'claude'`.

## Test Results
- **Albert (GPT-5)**: 200 OK, responded correctly with audio
- **SMART_PRIORITY rotation**: BROKEN — always selects Albert (index 0) regardless of message length
- **Root cause**: `participants.findIndex(p => p.name.toLowerCase().includes('claude'))` never matches "archimede"

## Fix Plan

### Step 1: Fix `selectSmartPriority` in `agent-selector.ts`
Change the agent matching from name-based to **type-based**:
```typescript
const agentIndex = participants.findIndex(p => 
  p.type.toLowerCase().includes(targetAgentName)
);
```

### Step 2: Fix `selectInterruptBased` in `agent-selector.ts`
Change keyword matching from `agentName` to `agent.type`:
```typescript
const agentType = participants[i].type.toLowerCase();
```

### Step 3: Deploy and re-test
- Short message → should select Pitagora (gemini)
- Medium message → should select Albert (chatgpt)
- Long message → should select Archimede (claude)

## Files Modified
| File | Risk |
|------|------|
| `supabase/functions/radio-chat-orchestrator/lib/agent-selector.ts` | Low — logic fix only |

