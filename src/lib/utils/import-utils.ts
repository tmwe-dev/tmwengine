// Utility functions for import operations

/**
 * Format cell values for display in import tables
 */
export const formatCellValue = (value: any, fieldKey?: string): string => {
  if (value === null || value === undefined || value === '' || value === false || value === '-') {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sì' : '';
  }
  
  // Format dates based on field type
  if (fieldKey && (typeof value === 'string' || value instanceof Date)) {
    const fieldLower = fieldKey.toLowerCase();
    
    // For scheduled_contact and next_contact_date: only day and month
    if (fieldLower.includes('scheduled_contact') || fieldLower.includes('next_contact_date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        }
      } catch (e) {
        // If date parsing fails, fall back to original value
      }
    }
    
    // For created_at and updated_at: time + short date
    if (fieldLower.includes('created_at') || fieldLower.includes('updated_at')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const shortDate = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
          return `${time} - ${shortDate}`;
        }
      } catch (e) {
        // If date parsing fails, fall back to original value
      }
    }
  }
  
  return String(value);
};

/**
 * Get country flag emoji from country name using countries data
 */
export const getCountryFlagFromName = (countryName: string, countriesData: any[]): string => {
  if (!countryName) return '🌍';
  
  const normalizedCountry = countryName.toLowerCase().trim();
  const country = countriesData.find(c => 
    c.name.toLowerCase() === normalizedCountry || 
    c.code.toLowerCase() === normalizedCountry
  );
  
  return country?.flag || '🌍';
};

/**
 * Get country flag emoji - simplified version without needing to pass countriesData
 * Use this when you don't have countriesData available
 */
export const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '🌍';
  
  // Common country mappings
  const flagMap: { [key: string]: string } = {
    'italy': '🇮🇹', 'italia': '🇮🇹', 'it': '🇮🇹',
    'france': '🇫🇷', 'francia': '🇫🇷', 'fr': '🇫🇷',
    'germany': '🇩🇪', 'germania': '🇩🇪', 'de': '🇩🇪',
    'spain': '🇪🇸', 'spagna': '🇪🇸', 'es': '🇪🇸',
    'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'gb': '🇬🇧',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'us': '🇺🇸'
  };
  
  const normalized = countryName.toLowerCase().trim();
  return flagMap[normalized] || '🌍';
};

/**
 * Get country full name from code
 */
export const getCountryFullName = (countryCode: string, countriesData: any[]): string => {
  if (!countryCode) return '';
  
  const country = countriesData.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
  return country?.name || countryCode;
};

/**
 * Get unique values from records array for a specific field
 */
export const getUniqueValues = <T extends Record<string, any>>(
  records: T[], 
  field: keyof T
): any[] => {
  const values = records.map(r => r[field]).filter(Boolean);
  return Array.from(new Set(values));
};

/**
 * Get unique values with count for a specific field
 */
export const getUniqueValuesWithCount = <T extends Record<string, any>>(
  records: T[],
  field: keyof T
): Array<{ value: any; count: number }> => {
  const countMap = new Map<any, number>();
  
  records.forEach(record => {
    const value = record[field];
    if (value) {
      countMap.set(value, (countMap.get(value) || 0) + 1);
    }
  });
  
  return Array.from(countMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Apply legacy filter tags to records
 */
export const applyFilterTags = <T extends Record<string, any>>(
  records: T[],
  filters: Array<{ field: string; value: any }>
): T[] => {
  let result = [...records];
  
  filters.forEach(filter => {
    result = result.filter(record => {
      const recordValue = record[filter.field];
      if (Array.isArray(filter.value)) {
        return filter.value.includes(recordValue);
      }
      return recordValue === filter.value;
    });
  });
  
  return result;
};

/**
 * Apply sorting configuration to records
 */
export const applySortingToRecords = <T extends Record<string, any>>(
  records: T[],
  sortConfig: {
    primary: { column: string; direction: 'asc' | 'desc' } | null;
    secondary: { column: string; direction: 'asc' | 'desc' } | null;
  }
): T[] => {
  if (!sortConfig.primary) return records;
  
  return [...records].sort((a, b) => {
    const primaryCompare = compareValues(
      a[sortConfig.primary!.column],
      b[sortConfig.primary!.column],
      sortConfig.primary!.direction
    );
    
    if (primaryCompare !== 0) return primaryCompare;
    
    if (sortConfig.secondary) {
      return compareValues(
        a[sortConfig.secondary.column],
        b[sortConfig.secondary.column],
        sortConfig.secondary.direction
      );
    }
    
    return 0;
  });
};

/**
 * Compare two values for sorting
 */
const compareValues = (a: any, b: any, direction: 'asc' | 'desc'): number => {
  const aValue = a ?? '';
  const bValue = b ?? '';
  
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    const comparison = aValue.localeCompare(bValue, 'it-IT', { sensitivity: 'base' });
    return direction === 'asc' ? comparison : -comparison;
  }
  
  if (aValue < bValue) return direction === 'asc' ? -1 : 1;
  if (aValue > bValue) return direction === 'asc' ? 1 : -1;
  return 0;
};
