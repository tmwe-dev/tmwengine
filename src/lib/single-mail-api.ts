/**
 * API DEDICATA PER SINGLE MAIL IMPORTER
 * 
 * Isolata dal sistema principale per evitare conflitti con cache condivisa.
 * NON modifica tmwe-api-integrated.ts o folder-cache.ts
 */

import { supabase } from "@/integrations/supabase/client";
import { getApiConfigFromDB } from "./tmwe-api-integrated";

/**
 * Ottiene cartelle email SENZA usare la cache condivisa
 * Dedicato esclusivamente a SingleMailImporter
 */
export const getSingleMailFolders = async (options?: { 
  include_counts?: boolean; 
  include_hierarchy?: boolean;
}): Promise<any[]> => {
  console.log('🔧 [SingleMailAPI] getFolders - NO CACHE - START');
  
  // 1. Ottieni token valido
  const config = await getApiConfigFromDB();
  if (!config?.accessToken) {
    console.error('❌ [SingleMailAPI] No valid token');
    throw new Error('TMWE_SESSION_EXPIRED');
  }

  const token = config.accessToken;

  // 2. Prepara configurazione chiamata
  const apiConfig = {
    include_counts: options?.include_counts ?? false,
    include_hierarchy: options?.include_hierarchy ?? false
  };

  console.log('🌐 [SingleMailAPI] Calling TMWE API directly (bypassing cache)');
  console.log('📋 Config:', apiConfig);

  // 3. Chiamata diretta all'edge function
  const OPTIMAL_CONFIG = {
    timeout: 60000,
    compression: true,
    streamResponse: false,
    cacheControl: 'no-cache'
  };

  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: { 
        endpoint: '/email_folder', 
        data: {
          handler: 'get_folders',
          ...apiConfig,
          bearerToken: token
        },
        optimizationFlags: OPTIMAL_CONFIG
      },
    });

    if (error) {
      console.error('❌ [SingleMailAPI] Edge Function error:', error);
      throw error;
    }

    console.log('✅ [SingleMailAPI] TMWE API returned:', {
      hasResult: !!responseData,
      isArray: Array.isArray(responseData),
      length: responseData?.length || 0,
      type: typeof responseData,
      sample: responseData?.[0]
    });

    // 4. Validazione e gestione formati multipli
    let folders: any[];
    
    if (Array.isArray(responseData)) {
      // Formato 1: array diretto
      folders = responseData;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      // Formato 2: { success: true, data: [...] }
      folders = responseData.data;
    } else if (responseData?.folders && Array.isArray(responseData.folders)) {
      // Formato 3: { folders: [...] }
      folders = responseData.folders;
    } else {
      console.warn('⚠️ [SingleMailAPI] Empty or invalid result from TMWE API', responseData);
      return [];
    }

    if (folders.length === 0) {
      console.warn('⚠️ [SingleMailAPI] No folders found');
      return [];
    }

    console.log('📁 [SingleMailAPI] Returning', folders.length, 'folders');
    
    return folders;
  } catch (error: any) {
    console.error('🔥 [SingleMailAPI] Error fetching folders:', error);
    throw error;
  }
};
