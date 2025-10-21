import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProposeTaskRequest {
  action: 'propose';
  task: {
    title: string;
    file: string;
    problem: string;
    solution?: string;
    priority: 'alta' | 'media' | 'bassa';
    proposedBy: 'ChatGPT' | 'Claude' | 'Gemini';
  };
}

interface CompleteTaskRequest {
  action: 'complete';
  taskId: string;
  implementationNotes?: string;
  filesModified?: string[];
}

interface ApproveTaskRequest {
  action: 'approve';
  taskId: string;
}

type RequestBody = ProposeTaskRequest | CompleteTaskRequest | ApproveTaskRequest;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: RequestBody = await req.json();

    console.log(`📋 AI Task action: ${body.action}`);

    // AZIONE: Proponi nuovo task
    if (body.action === 'propose') {
      const { task } = body as ProposeTaskRequest;

      // Inserisci in DB
      const { data: newTask, error: dbError } = await supabase
        .from('ai_collaboration_tasks')
        .insert({
          title: task.title,
          file: task.file,
          problem: task.problem,
          solution: task.solution,
          priority: task.priority,
          proposed_by: task.proposedBy,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Aggiorna ai-tasks.md
      const tasksPath = 'docs/ai-collaboration/ai-tasks.md';
      let tasksContent = await Deno.readTextFile(tasksPath);

      const prioritySection = task.priority === 'alta' ? '## 🔴 ALTA PRIORITÀ' : 
                              task.priority === 'media' ? '## 🟡 MEDIA PRIORITÀ' : 
                              '## 🟢 BASSA PRIORITÀ';

      const newTaskEntry = `\n- [ ] **${task.title}** (${task.proposedBy} - ${new Date().toISOString().split('T')[0]})\n  - File: \`${task.file}\`\n  - Problema: ${task.problem}\n  - ID Task: \`${newTask.id}\`\n`;

      // Inserisci nella sezione priorità corretta
      const sectionIndex = tasksContent.indexOf(prioritySection);
      if (sectionIndex !== -1) {
        const nextSectionIndex = tasksContent.indexOf('\n## ', sectionIndex + prioritySection.length);
        const insertPosition = nextSectionIndex !== -1 ? nextSectionIndex : tasksContent.indexOf('\n---', sectionIndex);
        
        if (insertPosition !== -1) {
          tasksContent = tasksContent.slice(0, insertPosition) + newTaskEntry + tasksContent.slice(insertPosition);
        }
      }

      // Aggiorna statistiche
      const statsMatch = tasksContent.match(/- \*\*Proposti\*\*: (\d+)/);
      if (statsMatch) {
        const currentCount = parseInt(statsMatch[1]);
        tasksContent = tasksContent.replace(
          /- \*\*Proposti\*\*: \d+/,
          `- **Proposti**: ${currentCount + 1}`
        );
      }

      await Deno.writeTextFile(tasksPath, tasksContent);

      console.log(`✅ Task proposto: ${task.title} (ID: ${newTask.id})`);

      return new Response(JSON.stringify({
        success: true,
        taskId: newTask.id,
        message: `Task "${task.title}" proposto con successo`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AZIONE: Approva task
    if (body.action === 'approve') {
      const { taskId } = body as ApproveTaskRequest;

      // Auth required per approvazione
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Aggiorna DB
      const { error: updateError } = await supabase
        .from('ai_collaboration_tasks')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', taskId);

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      console.log(`✅ Task ${taskId} approvato da ${user.email}`);

      return new Response(JSON.stringify({
        success: true,
        message: `Task approvato`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AZIONE: Completa task
    if (body.action === 'complete') {
      const { taskId, implementationNotes, filesModified } = body as CompleteTaskRequest;

      // Aggiorna DB
      const { data: completedTask, error: updateError } = await supabase
        .from('ai_collaboration_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: 'Lovable',
          implementation_notes: implementationNotes,
          files_modified: filesModified
        })
        .eq('id', taskId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      // Aggiorna ai-tasks.md (sposta in sezione completati)
      const tasksPath = 'docs/ai-collaboration/ai-tasks.md';
      let tasksContent = await Deno.readTextFile(tasksPath);

      // Rimuovi da sezione pendenti (cerca per ID)
      const taskPattern = new RegExp(`- \\[ \\] .*?ID Task: \`${taskId}\`.*?\\n(?:  - .*?\\n)*`, 'g');
      const taskMatch = tasksContent.match(taskPattern);
      
      if (taskMatch) {
        const taskEntry = taskMatch[0];
        tasksContent = tasksContent.replace(taskPattern, '');
        
        // Aggiungi in sezione completati (converti checkbox)
        const completedEntry = taskEntry
          .replace('- [ ]', '- [x]')
          .replace(/\n$/, ` (✅ Completato: ${new Date().toISOString().split('T')[0]})\n`);
        
        const completedSectionIndex = tasksContent.indexOf('## ✅ COMPLETATI');
        if (completedSectionIndex !== -1) {
          const statsIndex = tasksContent.indexOf('## 📊 Statistiche');
          tasksContent = tasksContent.slice(0, statsIndex) + completedEntry + '\n' + tasksContent.slice(statsIndex);
        }
      }

      // Aggiorna statistiche
      const completedMatch = tasksContent.match(/- \*\*Completati\*\*: (\d+)/);
      if (completedMatch) {
        const currentCount = parseInt(completedMatch[1]);
        tasksContent = tasksContent.replace(
          /- \*\*Completati\*\*: \d+/,
          `- **Completati**: ${currentCount + 1}`
        );
      }

      await Deno.writeTextFile(tasksPath, tasksContent);

      console.log(`✅ Task ${taskId} completato: ${completedTask.title}`);

      return new Response(JSON.stringify({
        success: true,
        message: `Task "${completedTask.title}" completato`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Azione non riconosciuta
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('🔥 Error in manage-ai-tasks:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
