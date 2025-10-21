import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * UPDATE COMPONENT METADATA
 * Aggiorna ui_category, tags, section per componenti esistenti
 */

interface Component {
  id: string;
  component_name: string;
  jsx_code: string;
  ui_category: string | null;
}

function categorizeUIComponent(componentName: string, jsxCode: string): string {
  const lower = componentName.toLowerCase();
  
  if (lower.includes('form') || jsxCode.includes('<Form')) return 'form';
  if (lower.includes('table') || jsxCode.includes('<Table')) return 'table';
  if (lower.includes('card') || jsxCode.includes('<Card')) return 'card';
  if (lower.includes('list')) return 'list';
  if (lower.includes('modal') || lower.includes('dialog')) return 'modal';
  if (lower.includes('button')) return 'button';
  if (lower.includes('input') || lower.includes('select') || lower.includes('textarea')) return 'input';
  if (lower.includes('nav') || lower.includes('menu')) return 'navigation';
  if (lower.includes('chart') || lower.includes('graph')) return 'visualization';
  if (lower.includes('layout') || lower.includes('container') || lower.includes('sidebar')) return 'layout';
  if (lower.includes('header')) return 'header';
  if (lower.includes('footer')) return 'footer';
  if (lower.includes('panel') || lower.includes('section')) return 'container';
  
  // Analisi JSX per casi edge
  if (jsxCode.includes('onClick') && jsxCode.includes('Button')) return 'button';
  if (jsxCode.includes('map(') && jsxCode.includes('<tr')) return 'table';
  if (jsxCode.includes('map(') && jsxCode.includes('<Card')) return 'card-grid';
  
  return 'component';
}

function detectSection(componentName: string, jsxCode: string): string {
  const lower = componentName.toLowerCase();
  
  if (lower.includes('header') || lower.includes('navbar') || lower.includes('topbar')) return 'Header';
  if (lower.includes('footer')) return 'Footer';
  if (lower.includes('sidebar') || lower.includes('menu')) return 'Sidebar';
  if (lower.includes('toolbar') || lower.includes('actions')) return 'Actions';
  
  // Analisi posizionale nel JSX
  if (jsxCode.includes('fixed top') || jsxCode.includes('sticky top')) return 'Header';
  if (jsxCode.includes('fixed bottom')) return 'Footer';
  if (jsxCode.includes('fixed left') || jsxCode.includes('fixed right')) return 'Sidebar';
  
  return 'Main Content';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Fetch components without ui_category
    const { data: components, error: fetchError } = await supabaseClient
      .from('design_lab_extracted_components')
      .select('id, component_name, jsx_code, ui_category')
      .is('ui_category', null)

    if (fetchError) throw fetchError

    if (!components || components.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nessun componente da aggiornare',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updated = 0
    let failed = 0

    for (const component of components as Component[]) {
      try {
        const uiCategory = categorizeUIComponent(component.component_name, component.jsx_code)
        const section = detectSection(component.component_name, component.jsx_code)

        const { error: updateError } = await supabaseClient
          .from('design_lab_extracted_components')
          .update({ 
            ui_category: uiCategory,
            section: section
          })
          .eq('id', component.id)

        if (updateError) {
          console.error(`Error updating ${component.id}:`, updateError)
          failed++
        } else {
          updated++
        }
      } catch (err) {
        console.error(`Failed to process ${component.id}:`, err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total: components.length,
        updated,
        failed,
        message: `Aggiornati ${updated} componenti, ${failed} errori`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
