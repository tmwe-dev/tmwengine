# 🏗️ Architettura Sistema Audio Multi-Agente

---

## Flusso Completo: User Message → Audio Playback

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend<br/>(ChatLaboratory)
    participant O as Orchestrator<br/>(Edge Function)
    participant E as ElevenLabs API
    participant DB as Supabase DB
    participant RT as Realtime<br/>(postgres_changes)

    U->>F: Invia messaggio
    F->>O: POST /bar-chat-orchestrator
    
    rect rgb(200, 255, 200)
        note right of O: TURNO 1: GEMINI
        O->>O: Genera risposta Gemini (1-2s)
        O->>DB: Salva messaggio (INSERT)
        O->>E: Genera audio (voice_id: Vittorio)
        E-->>O: audio_url
        O->>DB: UPDATE audio_url
    end
    
    DB->>RT: postgres_changes event (INSERT)
    RT->>F: Notifica nuovo messaggio
    
    rect rgb(200, 200, 255)
        note right of F: FRONTEND - TAB AUTO-SWITCH
        F->>F: setActiveTab(gemini.id)
        F->>F: Render <AudioPlayer autoPlay />
        F->>F: Audio playing... 🔊
        F->>F: Event 'ended' → handleAudioEnd()
        F->>F: setActiveTab(chatgpt.id)
    end
    
    rect rgb(255, 255, 200)
        note right of O: TURNO 2: CHATGPT
        O->>O: Genera risposta ChatGPT (3-4s)
        O->>DB: Salva messaggio (INSERT)
        O->>E: Genera audio (voice_id: Renny)
        E-->>O: audio_url
        O->>DB: UPDATE audio_url
    end
    
    DB->>RT: postgres_changes event (INSERT)
    RT->>F: Notifica nuovo messaggio
    F->>F: Render <AudioPlayer autoPlay />
    F->>F: Audio playing... 🔊
    
    rect rgb(255, 220, 255)
        note right of O: TURNO 3: CLAUDE
        O->>O: Genera risposta Claude (4-6s)
        O->>DB: Salva messaggio (INSERT)
        O->>E: Genera audio (voice_id: Tonino)
        E-->>O: audio_url
        O->>DB: UPDATE audio_url
    end
    
    DB->>RT: postgres_changes event (INSERT)
    RT->>F: Notifica nuovo messaggio
    F->>F: Render <AudioPlayer autoPlay />
    F->>F: Audio playing... 🔊
```

---

## Voice Agent Matching Flow

```mermaid
flowchart TD
    A[currentAgent.name<br/>'ChatGPT'] --> B{Lookup Keywords}
    B -->|chatgpt| C[gpt, openai, renny]
    B -->|claude| D[anthropic, claude, tonino]
    B -->|gemini| E[gemini, google, vittorio]
    
    C --> F{Search in activeVoiceAgents}
    D --> F
    E --> F
    
    F -->|voiceName includes<br/>any keyword| G[✅ Match Found]
    F -->|No Match| H[⚠️ Warning Log]
    
    G --> I[generateAudioForSingleResponse]
    I --> J[ElevenLabs API<br/>POST /v1/text-to-speech]
    J --> K[audio_url saved in DB]
    
    H --> L[Skip Audio Generation]
    
    style G fill:#90EE90
    style H fill:#FFB6C1
    style K fill:#87CEEB
```

**Esempio Concreto:**

```typescript
currentAgent = { name: 'ChatGPT', type: 'openai' }
activeVoiceAgents = [
  { name: 'Renny - GPT', voice_id: '11szj1LU...' },
  { name: 'Tonino - Anthropic', voice_id: 'Ak3m7Npq...' },
  { name: 'Vittorio - Gemini', voice_id: 'KOtk7Uqu...' }
]

// Step 1: Lookup keywords
agentKey = 'chatgpt'
searchKeywords = ['gpt', 'openai', 'renny']

// Step 2: Search in activeVoiceAgents
voiceName = 'renny - gpt' // lowercase
searchKeywords.some(kw => voiceName.includes(kw))
// 'gpt' is included → Match ✅

// Result:
agentVoice = { name: 'Renny - GPT', voice_id: '11szj1LU...' }
```

---

## Component Hierarchy (Frontend)

```mermaid
graph TB
    CL[ChatLaboratory.tsx<br/>🎯 Main Container] --> MTV[MessageTabsView.tsx<br/>📑 Tab Manager]
    MTV --> MAM[MultiAgentMessage.tsx<br/>💬 Message Card]
    MAM --> AMP[AudioMessagePlayer.tsx<br/>🔊 Audio Player]
    
    CL -->|isBarMode| BMC[BarModeControls.tsx<br/>⚙️ Settings]
    CL -->|conversationId| LHC[LabHeaderControls.tsx<br/>📊 Header]
    
    AMP -->|onPlayEnd| MTV
    MTV -->|handleAudioEnd| MTV
    MTV -->|setActiveTab| MAM
    
    style AMP fill:#90EE90
    style MTV fill:#87CEEB
    style CL fill:#FFB6C1
    style MAM fill:#FFF8DC
```

---

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> SendingMessage: User sends message
    SendingMessage --> WaitingOrchestrator: POST /bar-chat-orchestrator
    
    WaitingOrchestrator --> GeneratingGemini: Orchestrator starts
    GeneratingGemini --> SavedGemini: Save to DB + Generate Audio
    SavedGemini --> PlayingGemini: Realtime → setActiveTab(gemini)
    
    PlayingGemini --> GeneratingChatGPT: handleAudioEnd()
    GeneratingChatGPT --> SavedChatGPT: Save to DB + Generate Audio
    SavedChatGPT --> PlayingChatGPT: Realtime → setActiveTab(chatgpt)
    
    PlayingChatGPT --> GeneratingClaude: handleAudioEnd()
    GeneratingClaude --> SavedClaude: Save to DB + Generate Audio
    SavedClaude --> PlayingClaude: Realtime → setActiveTab(claude)
    
    PlayingClaude --> Idle: handleAudioEnd() (no more messages)
    
    PlayingGemini --> PausedGemini: User clicks pause
    PausedGemini --> PlayingGemini: User clicks play
    PausedGemini --> GeneratingChatGPT: handleAudioEnd() (audio ended during pause)
```

---

## Audio Auto-Follow Logic

```mermaid
flowchart TD
    A[Nuovo messaggio ricevuto] --> B{È il primo<br/>messaggio AI?}
    B -->|Sì| C[Cambia tab immediatamente<br/>setActiveTab]
    B -->|No| D[NON cambiare tab<br/>Audio in corso]
    
    C --> E[Render AudioPlayer<br/>autoPlay=true]
    D --> F[Messaggio in coda]
    
    E --> G{Audio terminato?}
    G -->|Event 'ended'| H[handleAudioEnd]
    G -->|User pause| I[NO action]
    
    H --> J{Ci sono messaggi<br/>successivi?}
    J -->|Sì| K[setActiveTab next message]
    J -->|No| L[Fine turno]
    
    K --> E
    I --> E
    
    style C fill:#90EE90
    style D fill:#FFB6C1
    style H fill:#87CEEB
```

---

## Database Schema (Relevanti)

```mermaid
erDiagram
    chat_laboratory_conversations ||--o{ chat_laboratory_messages : has
    chat_laboratory_conversations ||--o| chat_laboratory_bar_mode : has_settings
    
    chat_laboratory_conversations {
        uuid id PK
        string titolo
        timestamp created_at
        timestamp updated_at
        jsonb active_participants
        boolean economy_mode
    }
    
    chat_laboratory_messages {
        uuid id PK
        uuid conversation_id FK
        int message_sequence
        string sender_type
        string sender_name
        text content
        string audio_url
        int token_input
        int token_output
        int tempo_risposta_ms
        jsonb attachments
        timestamp created_at
    }
    
    chat_laboratory_bar_mode {
        uuid id PK
        uuid conversation_id FK
        string mode
        string agent_mode
        string conversation_style
        int pause_between_turns_ms
        boolean voice_enabled
    }
```

---

## Critical Data Flow: `audio_url` Population

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant E as ElevenLabs
    participant DB as Supabase DB
    participant F as Frontend

    O->>O: Generate AI response (text)
    O->>DB: INSERT message (audio_url = NULL)
    
    alt Voice Enabled & Agent Voice Found
        O->>E: POST /text-to-speech<br/>{text, voice_id}
        E-->>O: {audio_url}
        O->>DB: UPDATE audio_url WHERE id = message_id
        Note over DB: audio_url NOW populated ✅
    else No Voice / No Match
        Note over O: Skip audio generation
        Note over DB: audio_url remains NULL
    end
    
    DB->>F: Realtime postgres_changes
    F->>F: Render message with audio player
```

---

## Performance Optimization: Sequential vs Parallel

**Attuale (Sequential):** ✅ WORKING

```
Gemini (2s) → Audio (0.5s) → ChatGPT (4s) → Audio (0.5s) → Claude (6s) → Audio (0.5s)
Total Time: ~13.5s
```

**Alternativa (Parallel):** ⚠️ NON IMPLEMENTATO

```
Gemini (2s) ┐
ChatGPT (4s) ├─ All parallel → Max(2s, 4s, 6s) = 6s + Audio (0.5s each)
Claude (6s) ┘
Total Time: ~6.5s (ma ordine imprevedibile)
```

**Motivo scelta Sequential:**
- Ordine deterministico (Gemini → ChatGPT → Claude)
- Audio playback sequenziale naturale
- Debugging più semplice
- Context building progressivo (ogni agente vede risposte precedenti)

---

## Error Handling & Logging

```mermaid
flowchart TD
    A[Start Agent Turn] --> B{Voice Enabled?}
    B -->|No| Z[Skip Audio]
    B -->|Yes| C{Agent Voice Found?}
    
    C -->|No| D[⚠️ console.warn<br/>No voice agent found]
    C -->|Yes| E[🎤 console.log<br/>Voice match found]
    
    E --> F[generateAudioForSingleResponse]
    F --> G{ElevenLabs Success?}
    
    G -->|Yes| H[✅ Audio URL saved]
    G -->|No| I[❌ console.error<br/>Audio generation failed]
    
    D --> Z
    I --> Z
    H --> K[Continue to next agent]
    Z --> K
    
    style E fill:#90EE90
    style D fill:#FFE4B5
    style I fill:#FFB6C1
    style H fill:#87CEEB
```

---

## Key Decisions & Trade-offs

| Decision | Pro | Con | Chosen |
|----------|-----|-----|--------|
| **Sequential Calls** | Deterministic order, progressive context | Slower total time | ✅ Yes |
| **Keyword Matching** | Flexible, robust | Requires maintenance if names change | ✅ Yes |
| **Immediate Audio Gen** | Low latency for user | Blocks orchestrator briefly | ✅ Yes |
| **autoPlay={true}** | Seamless UX | Browser permissions needed | ✅ Yes |
| **Tab Auto-Switch** | Follows conversation flow | Can be disruptive if disabled | ✅ Yes (with toggle) |

---

## File Structure

```
supabase/functions/bar-chat-orchestrator/
├── index.ts                    // Main orchestrator (500 lines)
├── lib/
│   ├── utils.ts               // Delay, token estimation
│   ├── config-loader.ts       // Load configs from DB
│   ├── prompt-builder.ts      // Build system prompts
│   ├── ai-providers.ts        // Claude, ChatGPT, Gemini calls
│   └── audio-generator.ts     // ElevenLabs integration

src/components/chat-laboratory/
├── MessageTabsView.tsx         // Tab manager + auto-follow (295 lines)
├── MultiAgentMessage.tsx       // Message card + audio player (341 lines)
├── AudioMessagePlayer.tsx      // Audio controls (148 lines)
└── BarModeControls.tsx         // Settings panel

src/pages/
└── ChatLaboratory.tsx          // Main page (1640 lines)
```

---

**📘 Per maggiori dettagli implementativi, vedi i file di backup.**
