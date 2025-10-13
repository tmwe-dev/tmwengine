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

// Funzione globale per montare il widget con ID univoco
window.mountElevenLabsConvai = function(agentId, widgetId = 'global-widget') {
  console.log(`Mounting ElevenLabs ConvAI widget with agentId: ${agentId}, widgetId: ${widgetId}`);
  
  // Rimuovi widget esistente con lo stesso ID
  const existing = document.querySelector(`elevenlabs-convai#${widgetId}`);
  if (existing) {
    console.log(`Removing existing widget: ${widgetId}`);
    existing.remove();
  }

  // Crea nuovo widget con ID univoco
  const widget = document.createElement('elevenlabs-convai');
  widget.setAttribute('agent-id', agentId);
  widget.id = widgetId;
  document.body.appendChild(widget);
  
  console.log(`ElevenLabs ConvAI widget mounted with ID: ${widgetId}`);
  return widget;
};

// Client tools globali per interazione con il CRM e Email
window.analyzeEmails = async function(params) {
  console.log('analyzeEmails called:', params);
  
  try {
    const { query, folder } = params;
    
    // Chiamata all'edge function per analizzare email
    const response = await fetch('https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/ai-email-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A',
      },
      body: JSON.stringify({
        action: 'analyze',
        query: query || '',
        folder: folder || 'INBOX'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Errore API: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, results: data };
  } catch (error) {
    console.error('Error in analyzeEmails:', error);
    return { success: false, error: error.message };
  }
};

window.countEmails = async function(params) {
  console.log('countEmails called:', params);
  
  try {
    const { folder, unreadOnly } = params;
    
    // Query diretta al database per contare email
    const response = await fetch('https://dlldkrzoxvjxpgkkttxu.supabase.co/rest/v1/email_messages?select=id', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A',
        'Range': '0-0'
      }
    });
    
    const contentRange = response.headers.get('Content-Range');
    const total = contentRange ? parseInt(contentRange.split('/')[1]) : 0;
    
    return { 
      success: true, 
      count: total,
      message: `Ci sono ${total} email nel sistema`
    };
  } catch (error) {
    console.error('Error in countEmails:', error);
    return { success: false, error: error.message };
  }
};

window.searchEmails = async function(params) {
  console.log('searchEmails called:', params);
  
  try {
    const { sender, subject, folder } = params;
    let url = 'https://dlldkrzoxvjxpgkkttxu.supabase.co/rest/v1/email_messages?select=*';
    
    if (sender) {
      url += `&from_email=ilike.*${encodeURIComponent(sender)}*`;
    }
    if (subject) {
      url += `&subject=ilike.*${encodeURIComponent(subject)}*`;
    }
    if (folder) {
      url += `&cartella=eq.${encodeURIComponent(folder)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A',
      }
    });
    
    const emails = await response.json();
    
    return { 
      success: true, 
      count: emails.length,
      emails: emails,
      message: `Trovate ${emails.length} email`
    };
  } catch (error) {
    console.error('Error in searchEmails:', error);
    return { success: false, error: error.message };
  }
};

window.createActivity = async function(params) {
  console.log('createActivity called:', params);
  
  try {
    const response = await fetch('https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/ai-crm-manager', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A',
      },
      body: JSON.stringify({
        action: 'create_activity',
        ...params
      })
    });
    
    const data = await response.json();
    return { success: true, data, message: 'Attività creata con successo' };
  } catch (error) {
    console.error('Error in createActivity:', error);
    return { success: false, error: error.message };
  }
};

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
        const searchInput = document.querySelector('input[placeholder*="Cerca"]');
        if (searchInput && data.query) {
          searchInput.value = data.query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return { success: true, message: `Ricerca: ${data.query}` };
        
      case 'show_notification':
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
      mainContent: document.querySelector('main')?.innerText || '',
      visibleButtons: document.querySelectorAll('button:not([disabled])').length,
      visibleInputs: document.querySelectorAll('input:not([disabled])').length,
    };
    
    return { success: true, content };
  } catch (error) {
    console.error('Error in read_page_content:', error);
    return { success: false, error: error.message };
  }
};
