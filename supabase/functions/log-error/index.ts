import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorLog {
  component: string;
  error: string;
  stack?: string;
  lovableGenerated: boolean;
  context?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const errorData: ErrorLog = await req.json();

    console.log(`🐛 Logging error from component: ${errorData.component}`);

    // Leggi errors-log.json
    const logPath = 'docs/ai-collaboration/errors-log.json';
    let log: any;
    
    try {
      const logContent = await Deno.readTextFile(logPath);
      log = JSON.parse(logContent);
    } catch {
      // Se file non esiste, crea struttura base
      log = {
        lastUpdate: new Date().toISOString(),
        buildErrors: [],
        runtimeErrors: [],
        warnings: [],
        performance: { slowComponents: [], memoryLeaks: [], unusedCode: [] },
        statistics: { totalErrors: 0, fixedToday: 0, avgResolutionTime: "N/A" }
      };
    }

    // Aggiungi nuovo errore
    const newError = {
      timestamp: new Date().toISOString(),
      component: errorData.component,
      error: errorData.error,
      stack: errorData.stack,
      context: errorData.context,
      lovableGenerated: errorData.lovableGenerated,
      status: 'open'
    };

    log.runtimeErrors.push(newError);
    log.lastUpdate = new Date().toISOString();
    log.statistics.totalErrors = log.runtimeErrors.length;

    // Salva aggiornamento
    await Deno.writeTextFile(logPath, JSON.stringify(log, null, 2));

    console.log(`✅ Error logged: ${errorData.error.substring(0, 50)}...`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Error logged successfully',
      errorId: log.runtimeErrors.length - 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('🔥 Error in log-error function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
