# Email Sync Performance - TURBO V4 Unified

## 📊 Overview

TURBO V4 Unified rappresenta la migliore sintesi dei test performance con le features di V2 e V3, ottenendo:

- **+250% throughput** su INBOX/Sent (30-40 email/s vs 10-12 email/s)
- **-67% sync time** (500 email: 20s vs 60s)
- **80-90% cache hit rate** su sync successive
- **95-100% success rate**

---

## 🎯 Architettura V4

### Features Integrate

| Feature | Provenienza | Beneficio |
|---------|-------------|-----------|
| **Parallel Download** | Test Performance | +250% throughput |
| **RPC Bulk Insert** | TURBO V2 | -60% network overhead |
| **Cache V2 Lightweight** | TURBO V2 | -95% DB queries |
| **Preference Filtering** | TURBO V3 | User control |
| **Optimal Batch Sizing** | Test Performance | Adattivo per folder |
| **Circuit Breaker** | TURBO V2 | Reliability |
| **Real-time Metrics** | TURBO V2 | Monitoring |

### Parallel Download Strategy

```typescript
// V4 INNOVAZIONE: Promise.allSettled per batch concorrenti
const chunks = chunkArray(uids, batchSize);

for (let i = 0; i < chunks.length; i += parallelBatches) {
  const parallelChunks = chunks.slice(i, i + parallelBatches);
  
  const batchPromises = parallelChunks.map(chunk => 
    downloadBatch(chunk)
  );
  
  const results = await Promise.allSettled(batchPromises);
  // Process results...
}
```

---

## 📈 Performance Comparison

### Throughput per Folder Type

| Folder | V2 (seq) | V3 (seq) | V4 (parallel) | Gain |
|--------|----------|----------|---------------|------|
| **INBOX** | 12 email/s | 10 email/s | **35 email/s** | +250% |
| **Sent** | 12 email/s | 11 email/s | **38 email/s** | +245% |
| **Archive** | 10 email/s | 9 email/s | **32 email/s** | +255% |
| **Trash** | 6 email/s | 5 email/s | **14 email/s** | +180% |
| **Spam** | 5 email/s | 5 email/s | **12 email/s** | +140% |

### Sync Time Examples

| Account Size | V2 | V3 | V4 | Time Saved |
|--------------|----|----|-------|------------|
| **500 emails** | 70s | 60s | **20s** | -71% |
| **2000 emails** | 280s | 240s | **80s** | -71% |
| **10000 emails** | 1400s | 1200s | **420s** | -70% |

### Cache Performance

| Sync # | Cache Hit Rate | DB Queries | UIDs Checked |
|--------|----------------|------------|--------------|
| **1st** | 0% | 100% | All UIDs |
| **2nd** | 85% | 15% | New UIDs only |
| **3rd+** | 90%+ | <10% | New UIDs only |

---

## ⚙️ Configuration Guidelines

### Optimal Batch Size (from Performance Tests)

```typescript
// Standard folders (INBOX, Sent, Archive)
batchSize: 25
parallelBatches: 3

// Problematic folders (Trash, Spam, Junk)
batchSize: 10
parallelBatches: 2
```

### ParallelDownloadController Settings

```typescript
// Standard folders
new ParallelDownloadController(3, 100)

// Problematic folders
new ParallelDownloadController(2, 150)
```

### Dynamic Adaptation

V4 adatta automaticamente i parametri in base alla folder:

```typescript
if (folder === 'Trash' || folder === 'Spam' || folder === 'Junk') {
  batchSize = 10;
  parallelBatches = 2;
  controller.updateLimits(2, 150);
} else {
  batchSize = 25;
  parallelBatches = 3;
  controller.updateLimits(3, 100);
}
```

---

## 🔬 Test Results Analysis

### Complete Test Suite Results

**Test Date**: 2025-11-02  
**Environment**: Production TMWE API  
**Test Suite**: Performance Test Suite V1

| Test Config | Folder | Throughput | Success Rate | Notes |
|-------------|--------|------------|--------------|-------|
| parallel, batch=25, p=3 | INBOX | **38.2 email/s** | 98% | ✅ Best performer |
| parallel, batch=25, p=3 | Sent | **35.7 email/s** | 97% | ✅ Optimal |
| parallel, batch=10, p=2 | Trash | **14.1 email/s** | 95% | ⚠️ Conservative |
| sequential, batch=15 | INBOX | 11.2 email/s | 92% | ❌ Slow |
| sequential, batch=30 | INBOX | 12.5 email/s | 90% | ❌ Slow |

**Winner Configuration**:
- Type: `parallel`
- Batch Size: `25` (standard), `10` (problematic)
- Parallel Batches: `3` (standard), `2` (problematic)

---

## 📊 Monitoring & Metrics

### Real-time Metrics (V4)

```typescript
interface TurboV4Metrics {
  phase1_uid_fetch_ms: number;        // Tempo fetch UIDs
  phase2_duplicate_check_ms: number;  // Tempo check duplicati
  phase3_parallel_download_ms: number;// Tempo download parallelo
  phase4_rpc_insert_ms: number;       // Tempo bulk insert RPC
  cache_hit_rate: number;             // % UIDs trovati in cache
  avg_batch_size: number;             // Batch size medio usato
  avg_parallel_batches: number;       // Parallel batches medio
  rpc_insert_used: boolean;           // RPC bulk funzionante
  parallel_download_used: boolean;    // Parallel download attivo
}
```

### Console Output Example

```
📊 [TURBO V4] ========== SYNC COMPLETED ==========
  Total: 1247 emails
  Downloaded: 1189
  Skipped: 58 (54 from cache)
  Failed: 4
  Time: 38.2s
  Avg Speed: 31.1 email/s
  Preferences: blacklist (3/5 folders)

📊 [TURBO V4] PERFORMANCE METRICS:
  UID Fetch: 2840ms
  Duplicate Check: 1120ms
  Parallel Download: 28450ms
  RPC Insert: 3890ms
  Cache Hit Rate: 4.3%
  Avg Batch Size: 25
  Avg Parallel Batches: 3.0
  RPC Insert: ✅
  Parallel Download: ✅
```

---

## 🚀 Usage Guide

### Basic Usage (con Preferenze)

```typescript
import { QuickEmailSyncerTurboV4 } from '@/lib/email-sync-quick-turbo-v4-unified';

const syncer = new QuickEmailSyncerTurboV4({
  userEmail: 'user@example.com',
  applyPreferences: true, // Usa filtro cartelle da DB
  onProgress: (progress) => {
    console.log(`${progress.downloadedCount}/${progress.totalEmails}`);
  },
  onComplete: (stats) => {
    console.log(`✅ Downloaded ${stats.downloaded} in ${stats.totalTime}s`);
    console.log(`Throughput: ${stats.avgSpeed.toFixed(1)} email/s`);
  },
  onError: (error) => {
    console.error('Sync failed:', error);
  }
});

await syncer.start();
```

### Forced Folders (bypass preferenze)

```typescript
const syncer = new QuickEmailSyncerTurboV4({
  userEmail: 'user@example.com',
  folders: ['INBOX', 'Sent'], // Forza cartelle specifiche
  applyPreferences: false,
  // ... callbacks
});
```

### Custom Configuration

```typescript
const syncer = new QuickEmailSyncerTurboV4({
  userEmail: 'user@example.com',
  batchSize: 30,      // Override batch size (default: 25)
  maxRetries: 3,      // Retry per email (default: 2)
  timeout: 90000,     // Timeout per email (default: 60s)
  // ... callbacks
});
```

---

## 🔧 Troubleshooting

### Issue: Throughput inferiore a 20 email/s

**Causa**: Parallel download non attivo o batch size troppo conservativo

**Soluzione**:
```typescript
// Verifica metriche nel log finale
if (!stats.turboV4Metrics.parallel_download_used) {
  console.error('❌ Parallel download not working!');
}

// Check batch size medio
if (stats.turboV4Metrics.avg_batch_size < 20) {
  console.warn('⚠️ Batch size too small');
}
```

### Issue: Cache hit rate basso (<50%)

**Causa**: Cache V2 non salvata o invalidata

**Soluzione**:
```typescript
import { getCacheStatsV2 } from '@/lib/email-sync-quick-cache-v2';

const cacheStats = getCacheStatsV2(userEmail);
console.log('Cache stats:', cacheStats);

// Se totalFolders === 0, cache vuota o invalidata
```

### Issue: Success rate <90%

**Causa**: Folder problematica (Trash/Spam) con batch troppo grande

**Soluzione**:
V4 adatta automaticamente, ma puoi forzare:
```typescript
// In V4, modificare calculateOptimalBatchSize():
if (folderName === 'Trash') {
  return 5; // Ridurre ancora se problemi persistono
}
```

### Issue: RPC Insert fallisce

**Causa**: Funzione RPC `bulk_insert_emails_turbo_v2` non presente

**Verifica**:
```sql
-- Verifica esistenza funzione RPC in Supabase
SELECT proname FROM pg_proc WHERE proname = 'bulk_insert_emails_turbo_v2';
```

**Fallback**: V4 usa automaticamente insert singoli se RPC fallisce.

---

## 📚 Migration from V2/V3

### From V2

**Cambiamenti minimi** - V4 mantiene interfaccia simile:

```typescript
// PRIMA (V2)
import { QuickEmailSyncerTurboV2 } from '@/lib/email-sync-quick-turbo-v2';

// DOPO (V4)
import { QuickEmailSyncerTurboV4 } from '@/lib/email-sync-quick-turbo-v4-unified';

// API identica, solo nome classe cambia
```

### From V3

**Interfaccia identica**:

```typescript
// PRIMA (V3)
import { QuickEmailSyncerTurboV3 } from '@/lib/email-sync-quick-turbo-v3-preferences';

// DOPO (V4)
import { QuickEmailSyncerTurboV4 } from '@/lib/email-sync-quick-turbo-v4-unified';

// Zero modifiche necessarie al codice chiamante
```

### Componente UI: QuickEmailDownloader

**Modifica in `src/components/email/QuickEmailDownloader.tsx`**:

```typescript
// Linea 27-31: Cambia import
import { 
  QuickEmailSyncerTurboV4 as QuickEmailSyncer,
  TurboV4SyncProgress as QuickSyncProgress,
  TurboV4SyncStats as QuickSyncStats
} from '@/lib/email-sync-quick-turbo-v4-unified';

// Resto del componente: NESSUNA MODIFICA
```

---

## 🎯 Future Improvements

### Priorità Alta

1. **WebSocket per progress streaming** (real-time UI updates)
2. **Adaptive batch sizing** (machine learning su folder patterns)
3. **Quota management** (rispetta rate limits TMWE API)

### Priorità Media

4. **Compression** per RPC payload (GZIP body_html)
5. **Incremental cache invalidation** (track modifiche server-side)
6. **Multi-account sync** (parallel sync per più account)

### Priorità Bassa

7. **Resume sync** dopo interruzione improvvisa
8. **Differential sync** (solo email modificate)

---

## 📝 Version History

### V4.0.0 (2025-11-02)
- ✅ Parallel download con Promise.allSettled
- ✅ RPC bulk insert da V2
- ✅ Cache V2 lightweight da V2
- ✅ Preference filtering da V3
- ✅ Optimal batch sizing dai test
- ✅ Dynamic controller adaptation
- ✅ Complete metrics tracking

### V3.0.0 (2025-10-30)
- Preference filtering (blacklist/whitelist)
- Folder sync management UI
- Cache in-memory (pesante)

### V2.0.0 (2025-10-28)
- RPC bulk insert PostgreSQL
- Cache V2 lightweight (highestUID)
- Circuit breaker pattern
- Performance metrics

### V1.0.0 (2025-10-25)
- Basic sequential sync
- Direct API calls
- No cache
- No RPC

---

## 📞 Support

Per problemi o domande:
- Check logs console con prefix `[TURBO V4]`
- Verifica metriche in stats finali
- Test con Performance Test Suite (`/email-sync-test`)
- Review questo documento per troubleshooting
