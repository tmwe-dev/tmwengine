import { useState, useMemo } from 'react';
import { startOfDay, endOfDay } from 'date-fns';

interface FilterTag {
  field: string;
  value: any;
  displayValue: string;
}

interface ImportedContact {
  [key: string]: any;
}

interface UseImportFiltersProps {
  allRecords: ImportedContact[];
  getCompanyActivities?: (contactId: string) => any[];
  hasUserActivitiesForContact?: (contactId: string) => boolean;
}

export const useImportFilters = ({
  allRecords,
  getCompanyActivities,
  hasUserActivitiesForContact
}: UseImportFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [myContactsWithActivitiesFilter, setMyContactsWithActivitiesFilter] = useState(false);
  const [hideContactsWithTodayActivities, setHideContactsWithTodayActivities] = useState(false);
  const [filterOnlyWithAlias, setFilterOnlyWithAlias] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterTag[]>([]);

  const hasCompletedActivityToday = (contactId: string): boolean => {
    if (!getCompanyActivities) return false;
    
    const activities = getCompanyActivities(contactId);
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    return activities.some(activity => {
      if (activity.stato !== 'completata') return false;
      if (!activity.scadenza) return false;
      
      const activityDate = new Date(activity.scadenza);
      return activityDate >= todayStart && activityDate <= todayEnd;
    });
  };

  const filteredRecords = useMemo(() => {
    let result = [...allRecords];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(record => {
        const searchFields = [
          record.company_name,
          record.company_alias,
          record.name,
          record.alias,
          record.citta
        ];
        
        return searchFields.some(field => 
          field && String(field).toLowerCase().includes(query)
        );
      });
    }
    
    // Apply origin filter
    if (originFilter && originFilter !== '__all__') {
      result = result.filter(record => record.origin === originFilter);
    }
    
    // Apply country filter  
    if (countryFilter && countryFilter !== '__all__') {
      result = result.filter(record => record.country === countryFilter);
    }
    
    // Apply notes filter
    if (hasNotesFilter) {
      result = result.filter(record => record.note && record.note.trim() !== '');
    }
    
    // Apply my contacts with activities filter
    if (myContactsWithActivitiesFilter && hasUserActivitiesForContact) {
      result = result.filter(record => hasUserActivitiesForContact(record.id));
    }
    
    // Apply hide today activities filter
    if (hideContactsWithTodayActivities) {
      result = result.filter(record => !hasCompletedActivityToday(record.id));
    }
    
    // Apply filter for companies with alias
    if (filterOnlyWithAlias) {
      result = result.filter(record => record.company_alias && record.company_alias.trim() !== '');
    }
    
    // Apply legacy filters
    activeFilters.forEach(filter => {
      result = result.filter(record => {
        const recordValue = record[filter.field];
        if (Array.isArray(filter.value)) {
          return filter.value.includes(recordValue);
        }
        return recordValue === filter.value;
      });
    });
    
    return result;
  }, [
    allRecords,
    searchQuery,
    originFilter,
    countryFilter,
    hasNotesFilter,
    myContactsWithActivitiesFilter,
    hideContactsWithTodayActivities,
    filterOnlyWithAlias,
    activeFilters,
    getCompanyActivities,
    hasUserActivitiesForContact
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setOriginFilter('');
    setCountryFilter('');
    setHasNotesFilter(false);
    setMyContactsWithActivitiesFilter(false);
    setHideContactsWithTodayActivities(false);
    setFilterOnlyWithAlias(false);
    setActiveFilters([]);
  };

  const hasActiveFilters = () => {
    return !!(
      searchQuery ||
      originFilter ||
      countryFilter ||
      hasNotesFilter ||
      myContactsWithActivitiesFilter ||
      hideContactsWithTodayActivities ||
      filterOnlyWithAlias ||
      activeFilters.length > 0
    );
  };

  return {
    searchQuery,
    setSearchQuery,
    originFilter,
    setOriginFilter,
    countryFilter,
    setCountryFilter,
    hasNotesFilter,
    setHasNotesFilter,
    myContactsWithActivitiesFilter,
    setMyContactsWithActivitiesFilter,
    hideContactsWithTodayActivities,
    setHideContactsWithTodayActivities,
    filterOnlyWithAlias,
    setFilterOnlyWithAlias,
    activeFilters,
    setActiveFilters,
    filteredRecords,
    resetFilters,
    hasActiveFilters
  };
};
