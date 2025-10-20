import { supabase } from '@/integrations/supabase/client';

/**
 * Logs project changes to the project_history table
 */
export async function logProjectChange(
  operation: string,
  fileModified?: string,
  tablesModified?: string[]
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('project_history').insert({
      operation,
      file_modified: fileModified,
      tables_modified: tablesModified,
      user_id: user?.id,
      metadata: {
        timestamp: new Date().toISOString(),
        environment: 'design-lab'
      }
    });
  } catch (error) {
    console.error('Error logging project change:', error);
  }
}
