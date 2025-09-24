// Cartella generale per gestione di tasti, pulsanti, eventi, funzioni

// Event handlers centrali per il CRM
export const crmEvents = {
  // Eventi per selezione multipla
  handleSelectAll: (items, setSelected) => {
    setSelected(items.map(item => item.id));
  },

  handleSelectNone: (setSelected) => {
    setSelected([]);
  },

  handleSelectItem: (itemId, selected, setSelected) => {
    if (selected.includes(itemId)) {
      setSelected(selected.filter(id => id !== itemId));
    } else {
      setSelected([...selected, itemId]);
    }
  },

  // Eventi per azioni bulk
  handleBulkCreateActivity: (selectedIds, onSuccess) => {
    console.log('Creazione attività bulk per:', selectedIds);
    onSuccess && onSuccess();
  },

  handleBulkAddToCampaign: (selectedIds, campaignId, onSuccess) => {
    console.log('Aggiunta a campagna bulk:', selectedIds, campaignId);
    onSuccess && onSuccess();
  },

  handleBulkOpenEmailComposer: (selectedIds, onSuccess) => {
    console.log('Apertura composer email per:', selectedIds);
    onSuccess && onSuccess();
  },

  // Eventi per gestione form
  handleFormSubmit: (formData, onSuccess, onError) => {
    try {
      console.log('Invio form:', formData);
      onSuccess && onSuccess(formData);
    } catch (error) {
      console.error('Errore invio form:', error);
      onError && onError(error);
    }
  },

  handleFormReset: (resetFunction) => {
    resetFunction && resetFunction();
  },

  // Eventi per navigazione
  handleNavigateToRecord: (recordId, recordType, navigate) => {
    navigate(`/${recordType}/${recordId}`);
  },

  handleGoBack: (navigate) => {
    navigate(-1);
  },

  // Eventi per modal e popup
  handleOpenModal: (modalId, setModals) => {
    setModals(prev => ({ ...prev, [modalId]: true }));
  },

  handleCloseModal: (modalId, setModals) => {
    setModals(prev => ({ ...prev, [modalId]: false }));
  },

  handleToggleModal: (modalId, modals, setModals) => {
    setModals(prev => ({ ...prev, [modalId]: !prev[modalId] }));
  },

  // Eventi per filtri e ricerca
  handleSearchChange: (searchTerm, setFilters) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  },

  handleFilterChange: (filterKey, filterValue, setFilters) => {
    setFilters(prev => ({ ...prev, [filterKey]: filterValue }));
  },

  handleClearFilters: (setFilters) => {
    setFilters({});
  },

  // Eventi per sorting
  handleSort: (column, currentSort, setSort) => {
    if (currentSort.column === column) {
      setSort({
        column,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSort({ column, direction: 'asc' });
    }
  },

  // Eventi per paginazione
  handlePageChange: (page, setPagination) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  },

  handlePageSizeChange: (pageSize, setPagination) => {
    setPagination(prev => ({ ...prev, pageSize, currentPage: 1 }));
  }
};

// Utility functions per gestione stato
export const crmUtils = {
  // Gestione loading states
  setLoading: (key, value, setLoadingStates) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  },

  // Gestione errori
  handleError: (error, setError, showToast) => {
    console.error('Errore CRM:', error);
    setError(error.message || 'Si è verificato un errore');
    showToast && showToast({
      title: "Errore",
      description: error.message || "Si è verificato un errore",
      variant: "destructive"
    });
  },

  // Gestione successo
  handleSuccess: (message, setSuccess, showToast) => {
    setSuccess(message);
    showToast && showToast({
      title: "Successo",
      description: message,
      variant: "default"
    });
  },

  // Validazione form
  validateRequired: (value, fieldName) => {
    if (!value || value.trim() === '') {
      return `${fieldName} è obbligatorio`;
    }
    return null;
  },

  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email non valida';
    }
    return null;
  },

  validatePhone: (phone) => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (phone && !phoneRegex.test(phone)) {
      return 'Numero di telefono non valido';
    }
    return null;
  },

  // Formattazione dati
  formatDate: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('it-IT');
  },

  formatDateTime: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('it-IT');
  },

  formatCurrency: (amount) => {
    if (!amount) return '€0,00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
};

// Constants per il CRM
export const crmConstants = {
  ROLES: {
    ADMIN: 'admin',
    COMMERCIALE: 'commerciale',
    MARKETING: 'marketing',
    OPERATIVO: 'operativo'
  },

  ACTIVITY_TYPES: {
    CHIAMATA: 'chiamata',
    MEETING: 'meeting',
    EMAIL: 'email',
    TASK: 'task'
  },

  ACTIVITY_STATUS: {
    APERTA: 'aperta',
    IN_CORSO: 'in_corso',
    COMPLETATA: 'completata',
    ANNULLATA: 'annullata'
  },

  PRIORITIES: {
    ALTA: 'alta',
    MEDIA: 'media',
    BASSA: 'bassa'
  },

  EMAIL_STATUS: {
    BOZZA: 'bozza',
    PROGRAMMATA: 'programmata',
    INVIATA: 'inviata',
    FALLITA: 'fallita',
    RICEVUTA: 'ricevuta'
  },

  EMAIL_DIRECTIONS: {
    INBOUND: 'inbound',
    OUTBOUND: 'outbound'
  },

  CAMPAIGN_STATUS: {
    ATTIVA: 'attiva',
    PAUSA: 'pausa',
    COMPLETATA: 'completata'
  }
};