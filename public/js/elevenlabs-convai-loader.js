// ElevenLabs ConvAI Loader
window.ElevenLabsConvaiLoader = {
  scriptLoaded: false,
  
  loadScript: function(callback) {
    if (this.scriptLoaded) {
      callback?.();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    
    script.onload = () => {
      console.log('ElevenLabs ConvAI script loaded');
      this.scriptLoaded = true;
      callback?.();
    };
    
    script.onerror = () => {
      console.error('Failed to load ElevenLabs ConvAI script');
    };
    
    document.body.appendChild(script);
  }
};

// Funzione globale per montare il widget
window.mountElevenLabsConvai = function(agentId) {
  console.log('Mounting ElevenLabs ConvAI widget with agentId:', agentId);
  
  // Rimuovi widget esistente se presente
  const existing = document.querySelector('elevenlabs-convai');
  if (existing) {
    existing.remove();
  }

  // Crea nuovo widget
  const widget = document.createElement('elevenlabs-convai');
  widget.setAttribute('agent-id', agentId);
  document.body.appendChild(widget);
  
  console.log('ElevenLabs ConvAI widget mounted');
};

// Client tools globali per interazione con il CRM
window.executeAppCommand = function(params) {
  console.log('executeAppCommand called:', params);
  
  try {
    const { command, data } = params;
    
    switch (command) {
      case 'navigate':
        if (data.path) {
          window.location.href = data.path;
        }
        return { success: true, message: `Navigazione a ${data.path}` };
        
      case 'search_contacts':
        // Trigger ricerca contatti
        const searchInput = document.querySelector('input[placeholder*="Cerca"]');
        if (searchInput && data.query) {
          searchInput.value = data.query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return { success: true, message: `Ricerca: ${data.query}` };
        
      case 'show_notification':
        // Mostra toast
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { title: data.title, description: data.message }
          }));
        }
        return { success: true };
        
      default:
        return { success: false, error: 'Comando non riconosciuto' };
    }
  } catch (error) {
    console.error('Error in executeAppCommand:', error);
    return { success: false, error: error.message };
  }
};

window.read_page_content = function() {
  console.log('read_page_content called');
  
  try {
    const content = {
      title: document.title,
      url: window.location.href,
      path: window.location.pathname,
      // Estrai contenuto principale
      mainContent: document.querySelector('main')?.innerText || '',
      // Conta elementi visibili
      visibleButtons: document.querySelectorAll('button:not([disabled])').length,
      visibleInputs: document.querySelectorAll('input:not([disabled])').length,
    };
    
    return { success: true, content };
  } catch (error) {
    console.error('Error in read_page_content:', error);
    return { success: false, error: error.message };
  }
};
