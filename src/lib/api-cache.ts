// Cache intelligente per API TMWE
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

export const getCachedData = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl = 5 * 60 * 1000 // 5 minuti default
): Promise<T> => {
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log('✅ Using cached data for:', cacheKey);
    return cached.data as T;
  }
  
  console.log('🔄 Fetching fresh data for:', cacheKey);
  const data = await fetchFn();
  
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  return data;
};

export const invalidateCache = (cacheKey?: string) => {
  if (cacheKey) {
    cache.delete(cacheKey);
    console.log('🗑️ Cache invalidated for:', cacheKey);
  } else {
    cache.clear();
    console.log('🗑️ All cache cleared');
  }
};

export const getCachedFolders = async (
  fetchFn: () => Promise<any>,
  ttl = 5 * 60 * 1000
) => {
  return getCachedData('folders_list', fetchFn, ttl);
};
